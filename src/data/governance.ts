import type { ContributorIdentity } from '../auth/identity';

export const REPO = 'Spartis31/d365-licensing-profiler';

/** Written in every issue body so a request stays recognisable if its label is lost. */
const REQUEST_MARKER = 'Submitted from the D365 Licensing Profiler.';
const REQUEST_LABEL = 'process-request';
const TRANSLATION_LABEL = 'ai-translation';
const APPROVAL_LABEL = 'approval-request';

export type GovernanceLevel = 'user' | 'approved' | 'moderator' | 'admin';

/** Approval is recognition, not permission: only these two levels may decide. */
export function canModerate(level: GovernanceLevel | null): boolean {
  return level === 'moderator' || level === 'admin';
}

/** Anyone signed in reaches the console; an unapproved user only sees their status there. */
export function canOpenConsole(level: GovernanceLevel | null): boolean {
  return level !== null;
}

/** Submitting is reserved for users someone has approved. */
export function canRequest(level: GovernanceLevel | null): boolean {
  return level !== null && level !== 'user';
}

export const GOVERNANCE_PATH = 'public/governance.json';

/** Fallback used before the file is fetched, and if the fetch ever fails. */
const SEED: Record<string, GovernanceLevel> = { Spartis31: 'admin' };

let levels: Record<string, GovernanceLevel> = SEED;

export function governanceLevels(): Record<string, GovernanceLevel> {
  return levels;
}

/** Adopts a just-saved map: the published file lags behind by one deployment. */
export function applyGovernance(next: Record<string, GovernanceLevel>): Record<string, GovernanceLevel> {
  levels = next;
  return levels;
}

/**
 * Levels live in a JSON file rather than in the source, so the console can edit
 * them through the GitHub API without anyone touching code.
 */
export async function loadGovernance(): Promise<Record<string, GovernanceLevel>> {
  try {
    // The query defeats the CDN cache, so a fresh approval is seen without a hard reload.
    const url = `${import.meta.env.BASE_URL}governance.json?t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (response.ok) levels = (await response.json()) as Record<string, GovernanceLevel>;
  } catch {
    // Keep the seed: the console stays usable for the default administrator.
  }
  return levels;
}

/** Pure form, so a view can react to the file arriving. */
export function levelIn(
  source: Record<string, GovernanceLevel>,
  identity: ContributorIdentity | null,
): GovernanceLevel | null {
  if (!identity) return null;
  // Signing in is enough to be a user; the file only records approvals and roles.
  return source[identity.login] ?? 'user';
}

export function levelOf(identity: ContributorIdentity | null): GovernanceLevel | null {
  return levelIn(levels, identity);
}

/** Labels carrying the decision, so a status change is a traceable GitHub event. */
export const STATUS_LABELS = {
  rejected: 'rejected',
  acceptedWithChanges: 'accepted-with-changes',
} as const;

export const REQUEST_LABEL_NAME = REQUEST_LABEL;

export type RequestStatus = 'pending' | 'accepted' | 'acceptedWithChanges' | 'rejected';

export interface ProcessRequest {
  number: number;
  title: string;
  url: string;
  body: string;
  /** GitHub account that posted, authenticated by GitHub itself. */
  author: string | null;
  status: RequestStatus;
  createdAt: string;
  needsTranslation: boolean;
}

interface RawIssue {
  number: number;
  title: string;
  html_url: string;
  body: string | null;
  state: string;
  created_at: string;
  user?: { login: string } | null;
  labels: Array<{ name: string }>;
  pull_request?: unknown;
}

function statusOf(issue: RawIssue): RequestStatus {
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  if (labels.includes(STATUS_LABELS.rejected)) return 'rejected';
  if (labels.includes(STATUS_LABELS.acceptedWithChanges)) return 'acceptedWithChanges';
  if (issue.state === 'closed') return 'accepted';
  return 'pending';
}

/** Pre-filled issue URL: no token in the browser, GitHub authenticates the author. */
export function newRequestUrl(options: {
  identity: ContributorIdentity;
  processes: Array<{ label: string; licence: string; domain: string }>;
  freeText: string;
  wantsTranslation: boolean;
}): string {
  const { processes, freeText, wantsTranslation } = options;
  const lines = [
    REQUEST_MARKER,
    '',
    processes.length > 0 ? '## Proposed processes' : '',
    ...processes.map((p) => `- **${p.label}** — domain: ${p.domain} — minimum licence: ${p.licence}`),
    '',
    freeText.trim() ? `## Comment\n\n${freeText.trim()}` : '',
    '',
    wantsTranslation ? '> AI translation requested (FR/EN).' : '',
  ].filter((line) => line !== '');

  const title =
    processes.length === 1
      ? `Standard process: ${processes[0].label}`
      : `Request to add ${processes.length} standard processes`;

  const labels = [REQUEST_LABEL, ...(wantsTranslation ? [TRANSLATION_LABEL] : [])];
  const params = new URLSearchParams({
    title: processes.length === 0 ? 'Open request' : title,
    body: lines.join('\n'),
    labels: labels.join(','),
  });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

/**
 * The one request an unapproved user may open, so a newcomer is not stuck outside
 * a system that only lists people who have already posted.
 */
export function approvalRequestUrl(identity: ContributorIdentity): string {
  const params = new URLSearchParams({
    title: `Approval request: ${identity.login}`,
    body: [REQUEST_MARKER, '', 'I would like to be approved as a contributor.'].join('\n'),
    labels: APPROVAL_LABEL,
  });
  return `https://github.com/${REPO}/issues/new?${params.toString()}`;
}

const CACHE_KEY = 'd365lic.requests';
const CACHE_TTL_MS = 5 * 60 * 1000;

export type RequestsResult =
  | { status: 'ok'; requests: ProcessRequest[]; cached: boolean }
  | { status: 'rateLimited' }
  | { status: 'error' };

/**
 * Reads requests from the public GitHub API. Unauthenticated calls are capped at
 * 60 per hour, hence the cache and the explicit rate-limit state.
 */
export async function fetchRequests(force = false): Promise<RequestsResult> {
  if (!force) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { at: number; requests: ProcessRequest[] };
        if (Date.now() - cached.at < CACHE_TTL_MS) {
          return { status: 'ok', requests: cached.requests, cached: true };
        }
      }
    } catch {
      // Corrupted cache: fall through to the network.
    }
  }

  try {
    // No label filter: GitHub silently drops unknown labels from a prefilled issue
    // URL, so a request is recognised by its body marker as well as by its label.
    const response = await fetch(`https://api.github.com/repos/${REPO}/issues?state=all&per_page=100`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.status === 403 || response.status === 429) return { status: 'rateLimited' };
    if (!response.ok) return { status: 'error' };

    const issues = (await response.json()) as RawIssue[];
    const requests = issues
      .filter((issue) => !issue.pull_request)
      .filter(
        (issue) =>
          issue.labels.some((l) => l.name.toLowerCase() === REQUEST_LABEL) ||
          (issue.body ?? '').includes(REQUEST_MARKER),
      )
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        body: issue.body ?? '',
        author: issue.user?.login ?? null,
        status: statusOf(issue),
        createdAt: issue.created_at,
        needsTranslation:
          issue.labels.some((l) => l.name.toLowerCase() === TRANSLATION_LABEL) ||
          (issue.body ?? '').includes('AI translation requested'),
      }));

    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), requests }));
    return { status: 'ok', requests, cached: false };
  } catch {
    return { status: 'error' };
  }
}
