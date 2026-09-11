import { REPO } from './governance';

/**
 * GitHub access from a static site.
 *
 * The REST API allows cross-origin writes (preflight returns PATCH/PUT/POST and
 * accepts the Authorization header), but no token can be obtained without a
 * server: the OAuth device flow endpoints do not support CORS. The user therefore
 * supplies a fine-grained token, kept in sessionStorage so it disappears when the
 * browser closes.
 */
const TOKEN_KEY = 'd365lic.ghToken';
const API = 'https://api.github.com';

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string;
  canWrite: boolean;
}

let token: string | null = sessionStorage.getItem(TOKEN_KEY);
let user: GitHubUser | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function currentUser(): GitHubUser | null {
  return user;
}

export function hasToken(): boolean {
  return token !== null;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${response.status} ${detail.slice(0, 200)}`);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}

export async function signInWithToken(candidate: string): Promise<GitHubUser> {
  token = candidate.trim();
  try {
    const me = await call<{ login: string; name: string | null; avatar_url: string }>('/user');
    // Write permission decides which actions the console may offer.
    const repo = await call<{ permissions?: { push?: boolean; maintain?: boolean; admin?: boolean } }>(
      `/repos/${REPO}`,
    );
    const permissions = repo.permissions ?? {};
    user = {
      login: me.login,
      name: me.name,
      avatarUrl: me.avatar_url,
      canWrite: Boolean(permissions.push || permissions.maintain || permissions.admin),
    };
    sessionStorage.setItem(TOKEN_KEY, token);
    emit();
    return user;
  } catch (error) {
    token = null;
    user = null;
    emit();
    throw error;
  }
}

export function signOutGitHub(): void {
  token = null;
  user = null;
  sessionStorage.removeItem(TOKEN_KEY);
  emit();
}

/** Restores a session token kept from a previous view of the console. */
export async function restoreSession(): Promise<void> {
  const saved = sessionStorage.getItem(TOKEN_KEY);
  if (!saved || user) return;
  try {
    await signInWithToken(saved);
  } catch {
    signOutGitHub();
  }
}

export interface IssueComment {
  id: number;
  author: string;
  avatarUrl: string;
  body: string;
  createdAt: string;
}

export async function listComments(issueNumber: number): Promise<IssueComment[]> {
  const raw = await call<
    Array<{ id: number; user: { login: string; avatar_url: string }; body: string; created_at: string }>
  >(`/repos/${REPO}/issues/${issueNumber}/comments?per_page=100`);
  return raw.map((c) => ({
    id: c.id,
    author: c.user.login,
    avatarUrl: c.user.avatar_url,
    body: c.body,
    createdAt: c.created_at,
  }));
}

export async function addComment(issueNumber: number, body: string): Promise<void> {
  await call(`/repos/${REPO}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

export async function updateIssue(
  issueNumber: number,
  changes: { state?: 'open' | 'closed'; labels?: string[]; title?: string; body?: string },
): Promise<void> {
  await call(`/repos/${REPO}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify(changes),
  });
}

export async function readFile(path: string): Promise<{ content: string; sha: string }> {
  const file = await call<{ content: string; sha: string }>(`/repos/${REPO}/contents/${path}`);
  const binary = atob(file.content.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return { content: new TextDecoder().decode(bytes), sha: file.sha };
}

export async function writeFile(path: string, content: string, sha: string, message: string): Promise<void> {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  await call(`/repos/${REPO}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: btoa(binary), sha }),
  });
}
