import type { MicrosoftIdentity } from '../auth/identity';

export const REPO = 'Spartis31/d365-licensing-profiler';

/** Marker written in every issue body so requests can be attributed to an alias. */
const ALIAS_MARKER = 'Alias Microsoft :';
const REQUEST_LABEL = 'demande-processus';
const TRANSLATION_LABEL = 'traduction-ia';

export type GovernanceLevel = 'contributor' | 'moderator' | 'admin';

export const GOVERNANCE_PATH = 'public/governance.json';

/** Fallback used before the file is fetched, and if the fetch ever fails. */
const SEED: Record<string, GovernanceLevel> = { thomasjulie: 'admin' };

let levels: Record<string, GovernanceLevel> = SEED;

export function governanceLevels(): Record<string, GovernanceLevel> {
  return levels;
}

/**
 * Levels live in a JSON file rather than in the source, so the console can edit
 * them through the GitHub API without anyone touching code.
 */
export async function loadGovernance(): Promise<Record<string, GovernanceLevel>> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}governance.json`, { cache: 'no-store' });
    if (response.ok) levels = (await response.json()) as Record<string, GovernanceLevel>;
  } catch {
    // Keep the seed: the console stays usable for the default administrator.
  }
  return levels;
}

export function levelOf(identity: MicrosoftIdentity | null): GovernanceLevel | null {
  if (!identity) return null;
  return levels[identity.alias] ?? 'contributor';
}

/** Labels carrying the decision, so a status change is a traceable GitHub event. */
export const STATUS_LABELS = {
  rejected: 'refuse',
  acceptedWithChanges: 'accepte-avec-modification',
} as const;

export const REQUEST_LABEL_NAME = 'demande-processus';

export type RequestStatus = 'pending' | 'accepted' | 'acceptedWithChanges' | 'rejected';

export interface ProcessRequest {
  number: number;
  title: string;
  url: string;
  body: string;
  alias: string | null;
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
  labels: Array<{ name: string }>;
  pull_request?: unknown;
}

function statusOf(issue: RawIssue): RequestStatus {
  const labels = issue.labels.map((l) => l.name.toLowerCase());
  if (labels.includes('refuse')) return 'rejected';
  if (labels.includes('accepte-avec-modification')) return 'acceptedWithChanges';
  if (issue.state === 'closed') return 'accepted';
  return 'pending';
}

function aliasOf(body: string | null): string | null {
  if (!body) return null;
  const match = new RegExp(`${ALIAS_MARKER}\\s*\`?([a-z0-9._-]+)\`?`, 'i').exec(body);
  return match ? match[1].toLowerCase() : null;
}

/** Pre-filled issue URL: no token in the browser, GitHub authenticates the author. */
export function newRequestUrl(options: {
  identity: MicrosoftIdentity;
  processes: Array<{ label: string; licence: string; domain: string }>;
  freeText: string;
  wantsTranslation: boolean;
}): string {
  const { identity, processes, freeText, wantsTranslation } = options;
  const lines = [
    `${ALIAS_MARKER} \`${identity.alias}\``,
    '',
    processes.length > 0 ? '## Processus proposés' : '',
    ...processes.map((p) => `- **${p.label}** — domaine : ${p.domain} — licence minimale : ${p.licence}`),
    '',
    freeText.trim() ? `## Commentaire\n\n${freeText.trim()}` : '',
    '',
    wantsTranslation ? '> Traduction FR/EN par IA demandée.' : '',
  ].filter((line) => line !== '');

  const title =
    processes.length === 1
      ? `Processus standard : ${processes[0].label}`
      : `Demande d'ajout de ${processes.length} processus standard`;

  const labels = [REQUEST_LABEL, ...(wantsTranslation ? [TRANSLATION_LABEL] : [])];
  const params = new URLSearchParams({
    title: processes.length === 0 ? 'Demande libre' : title,
    body: lines.join('\n'),
    labels: labels.join(','),
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
    const response = await fetch(
      `https://api.github.com/repos/${REPO}/issues?state=all&labels=${REQUEST_LABEL}&per_page=100`,
      { headers: { Accept: 'application/vnd.github+json' } },
    );
    if (response.status === 403 || response.status === 429) return { status: 'rateLimited' };
    if (!response.ok) return { status: 'error' };

    const issues = (await response.json()) as RawIssue[];
    const requests = issues
      .filter((issue) => !issue.pull_request)
      .map((issue) => ({
        number: issue.number,
        title: issue.title,
        url: issue.html_url,
        body: issue.body ?? '',
        alias: aliasOf(issue.body),
        status: statusOf(issue),
        createdAt: issue.created_at,
        needsTranslation: issue.labels.some((l) => l.name.toLowerCase() === TRANSLATION_LABEL),
      }));

    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), requests }));
    return { status: 'ok', requests, cached: false };
  } catch {
    return { status: 'error' };
  }
}
