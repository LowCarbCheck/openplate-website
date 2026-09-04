/**
 * site.ts, the handful of constants the whole site agrees on.
 *
 * Kept in one module because two of them are correctness-critical: the origin
 * is what every canonical URL, `og:url` and sitemap entry is built from, and
 * the documentation paths are the contract with the generated documentation
 * tree (a slug that does not exist there is a link to a 404 that no test
 * catches, because the pages are prerendered separately).
 */

/** The public origin, with no trailing slash. Canonical URLs, og:url and the sitemap are built from it. */
export const SITE_ORIGIN = 'https://openplate.de';

/** The one static Open Graph image, in `public/`. Its absolute URL is built from SITE_ORIGIN. */
export const OG_IMAGE_PATH = '/og.png';

/** Every documentation page the site links to by hand. Slugs come from each repository's README table. */
export const DOC_PATHS = {
  appArchitecture: '/docs/app/architecture',
  appSelfHosting: '/docs/app/self-hosting',
  syncProtocol: '/docs/sync/protocol',
  inferenceHardware: '/docs/inference/hardware',
  inferencePrivacy: '/docs/inference/privacy',
} as const;

/** Release notes pages. The app's live on GitHub; the sync server's are rendered here. */
export const SYNC_RELEASES_PATH = '/releases/sync';

/** The source repositories. */
export const REPOSITORIES = {
  app: 'https://github.com/LowCarbCheck/openplate',
  sync: 'https://github.com/LowCarbCheck/openplate-sync',
  inference: 'https://github.com/LowCarbCheck/openplate-inference',
} as const;

/** The app's own releases are published as GitHub releases, not as a page here. */
export const APP_RELEASES_URL = `${REPOSITORIES.app}/releases`;
