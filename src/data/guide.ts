import { ROLES_GUIDE_EDITION } from './standardRoles';

/**
 * Permanent link published on the Microsoft licensing site. It always redirects
 * to the current edition, so it is more reliable than scraping the page.
 */
export const GUIDE_PERMALINK = 'https://go.microsoft.com/fwlink/?LinkId=866544&clcid=0x409';

/** Edition the shipped catalogue and standard roles were extracted from. */
export const CATALOG_GUIDE_EDITION = ROLES_GUIDE_EDITION;

/**
 * Page "Run workflow" of the role update job. Opening it rather than calling the
 * API keeps the action gated by GitHub repository permissions, with no token in
 * the browser.
 */
export const UPDATE_ROLES_WORKFLOW =
  'https://github.com/Spartis31/d365-licensing-profiler/actions/workflows/update-roles.yml';

const FILENAME_EDITION = /Dynamics365LicensingGuide([A-Za-z]+)(\d{4})\.pdf/i;

/** Reads the edition out of the redirect target, e.g. `...GuideSeptember2026.pdf`. */
export function editionFromUrl(url: string): string | null {
  const match = FILENAME_EDITION.exec(url);
  return match ? `${match[1]} ${match[2]}` : null;
}

export type GuideCheck =
  | { status: 'current'; edition: string }
  | { status: 'outdated'; edition: string }
  | { status: 'unknown' };

/**
 * Resolves the edition currently published by Microsoft. The CDN serves the PDF
 * with `Access-Control-Allow-Origin: *`, so the browser can follow the redirect
 * and read the final URL without any server relay.
 */
export async function checkLatestEdition(signal?: AbortSignal): Promise<GuideCheck> {
  try {
    const response = await fetch(GUIDE_PERMALINK, { method: 'GET', redirect: 'follow', signal });
    const edition = editionFromUrl(response.url);
    if (!edition) return { status: 'unknown' };
    return edition.toLowerCase() === CATALOG_GUIDE_EDITION.toLowerCase()
      ? { status: 'current', edition }
      : { status: 'outdated', edition };
  } catch {
    return { status: 'unknown' };
  }
}
