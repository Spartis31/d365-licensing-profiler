import { useSyncExternalStore } from 'react';

/**
 * Identity of a Microsoft employee.
 *
 * The shape matches what an Entra ID token exposes, so swapping the local
 * provider for MSAL later only changes how an identity is obtained, not how the
 * views consume it.
 */
export interface MicrosoftIdentity {
  /** Corporate alias, e.g. `thomasjulie`. */
  alias: string;
  email: string;
  displayName: string;
  /** How the identity was obtained; `local` carries no security guarantee. */
  provider: 'local' | 'entra';
}

export type RejectionReason = 'format' | 'domain' | 'guest';

export type IdentityResult =
  | { ok: true; identity: MicrosoftIdentity }
  | { ok: false; reason: RejectionReason };

const CORPORATE_DOMAIN = '@microsoft.com';
const STORAGE_KEY = 'd365lic.identity';

/** Microsoft's Entra tenant, for the future MSAL authority. */
export const MICROSOFT_TENANT_ID = '72f988bf-86f1-41af-91ab-2d7cd011db47';

/**
 * Validates a corporate sign-in. Guests of the Microsoft tenant carry `#EXT#`
 * in their principal name and are rejected even though they belong to it.
 */
export function identityFromEmail(raw: string, provider: MicrosoftIdentity['provider']): IdentityResult {
  const email = raw.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, reason: 'format' };
  if (email.includes('#ext#')) return { ok: false, reason: 'guest' };
  if (!email.endsWith(CORPORATE_DOMAIN)) return { ok: false, reason: 'domain' };

  const alias = email.slice(0, -CORPORATE_DOMAIN.length);
  if (alias.length === 0) return { ok: false, reason: 'format' };

  return { ok: true, identity: { alias, email, displayName: alias, provider } };
}

let current: MicrosoftIdentity | null = read();
const listeners = new Set<() => void>();

function read(): MicrosoftIdentity | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result = identityFromEmail(String(parsed.email ?? ''), 'local');
    return result.ok ? result.identity : null;
  } catch {
    return null;
  }
}

function emit(): void {
  for (const listener of listeners) listener();
}

export function signIn(identity: MicrosoftIdentity): void {
  current = identity;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(identity));
  emit();
}

export function signOut(): void {
  current = null;
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function useIdentity(): MicrosoftIdentity | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}
