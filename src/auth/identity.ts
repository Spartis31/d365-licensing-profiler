import { useSyncExternalStore } from 'react';

/**
 * A contributor is a verified GitHub account.
 *
 * Nothing is asked of the person beyond that account name: `displayName` comes
 * from their own public GitHub profile, so the tool collects no personal data.
 */
export interface ContributorIdentity {
  login: string;
  displayName: string;
  avatarUrl: string;
}

export type RejectionReason = 'format' | 'unknown' | 'rateLimited' | 'network';

export type IdentityResult = { ok: true; identity: ContributorIdentity } | { ok: false; reason: RejectionReason };

const STORAGE_KEY = 'd365lic.identity';

/** GitHub logins: alphanumeric and single hyphens, 39 characters at most. */
const LOGIN_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function isLoginShape(raw: string): boolean {
  return LOGIN_PATTERN.test(raw.trim().replace(/^@/, ''));
}

/**
 * Checks the account exists. Ownership is proven later by GitHub itself, when
 * the person signs in there to post their request.
 */
export async function verifyGitHubAccount(rawLogin: string): Promise<IdentityResult> {
  const login = rawLogin.trim().replace(/^@/, '');
  if (!isLoginShape(login)) return { ok: false, reason: 'format' };

  try {
    const response = await fetch(`https://api.github.com/users/${login}`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (response.status === 404) return { ok: false, reason: 'unknown' };
    if (!response.ok) {
      // 60 calls an hour per address without a token, shared by everyone behind it.
      const remaining = response.headers.get('x-ratelimit-remaining');
      return { ok: false, reason: remaining === '0' ? 'rateLimited' : 'network' };
    }

    const user = (await response.json()) as { login: string; name: string | null; avatar_url: string };
    return {
      ok: true,
      identity: { login: user.login, displayName: user.name ?? user.login, avatarUrl: user.avatar_url },
    };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

let current: ContributorIdentity | null = read();
const listeners = new Set<() => void>();

function read(): ContributorIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const login = String(parsed.login ?? '');
    // Identities stored before the move to GitHub carried an email instead.
    if (!isLoginShape(login)) return null;
    return {
      login,
      displayName: String(parsed.displayName ?? ''),
      avatarUrl: String(parsed.avatarUrl ?? ''),
    };
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function signIn(identity: ContributorIdentity): void {
  current = identity;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  emit();
}

export function signOut(): void {
  current = null;
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useIdentity(): ContributorIdentity | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
