import { describe, expect, it } from 'vitest';
import { identityFromEmail } from './identity';
import { editionFromUrl } from '../data/guide';

describe('identityFromEmail', () => {
  it('accepts a corporate address and derives the alias', () => {
    const result = identityFromEmail('ThomasJulie@Microsoft.com', 'local');
    expect(result).toEqual({
      ok: true,
      identity: {
        alias: 'thomasjulie',
        email: 'thomasjulie@microsoft.com',
        displayName: 'thomasjulie',
        provider: 'local',
      },
    });
  });

  it('rejects any domain other than microsoft.com', () => {
    for (const email of ['user@contoso.com', 'user@microsoft.onmicrosoft.com', 'user@notmicrosoft.com']) {
      expect(identityFromEmail(email, 'local')).toEqual({ ok: false, reason: 'domain' });
    }
  });

  it('rejects guests of the Microsoft tenant', () => {
    const guest = 'user_contoso.com#EXT#@microsoft.com';
    expect(identityFromEmail(guest, 'local')).toEqual({ ok: false, reason: 'guest' });
  });

  it('rejects malformed input', () => {
    for (const email of ['', 'not-an-email', '@microsoft.com']) {
      expect(identityFromEmail(email, 'local')).toEqual({ ok: false, reason: 'format' });
    }
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
