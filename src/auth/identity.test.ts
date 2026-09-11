import { afterEach, describe, expect, it, vi } from 'vitest';
import { isLoginShape, verifyGitHubAccount } from './identity';
import { editionFromUrl } from '../data/guide';

describe('isLoginShape', () => {
  it('accepts real GitHub logins', () => {
    for (const login of ['octocat', 'Spartis31', 'a', 'some-user-name']) {
      expect(isLoginShape(login)).toBe(true);
    }
  });

  it('rejects what GitHub would never issue', () => {
    for (const login of ['', '-leading', 'trailing-', 'double--hyphen', 'has space', 'a@b', 'x'.repeat(40)]) {
      expect(isLoginShape(login)).toBe(false);
    }
  });
});

describe('verifyGitHubAccount', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('accepts an account GitHub knows, and takes the name from the public profile', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ login: 'Spartis31', name: 'Thomas J.', avatar_url: 'https://avatars/1' }),
      })),
    );
    const result = await verifyGitHubAccount('@spartis31');
    expect(result).toEqual({
      ok: true,
      identity: { login: 'Spartis31', displayName: 'Thomas J.', avatarUrl: 'https://avatars/1' },
    });
  });

  it('falls back to the login when the profile carries no name', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ login: 'octocat', name: null, avatar_url: 'https://avatars/2' }),
      })),
    );
    const result = await verifyGitHubAccount('octocat');
    expect(result).toEqual({
      ok: true,
      identity: { login: 'octocat', displayName: 'octocat', avatarUrl: 'https://avatars/2' },
    });
  });

  it('rejects an account that does not exist', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })));
    expect(await verifyGitHubAccount('ghost-account')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('names the hourly GitHub quota instead of blaming the network', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 403,
        headers: { get: (name: string) => (name === 'x-ratelimit-remaining' ? '0' : null) },
      })),
    );
    expect(await verifyGitHubAccount('octocat')).toEqual({ ok: false, reason: 'rateLimited' });
  });

  it('reports a network failure rather than letting anyone through', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    expect(await verifyGitHubAccount('octocat')).toEqual({ ok: false, reason: 'network' });
  });

  it('never calls GitHub for a malformed login', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect(await verifyGitHubAccount('not a login')).toEqual({ ok: false, reason: 'format' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('editionFromUrl', () => {
  it('reads the edition from the redirect target', () => {
    const url =
      'https://cdn-dynmedia-1.microsoft.com/is/content/microsoftcorp/microsoft/bade/documents/products-and-services/en-us/bizapps/Dynamics365LicensingGuideSeptember2026.pdf';
    expect(editionFromUrl(url)).toBe('September 2026');
  });

  it('returns null when the filename does not carry an edition', () => {
    expect(editionFromUrl('https://example.com/guide.pdf')).toBeNull();
  });
});
