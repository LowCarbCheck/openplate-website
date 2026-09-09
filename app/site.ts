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
  appConfiguration: '/docs/app/configuration',
  appSelfHosting: '/docs/app/self-hosting',
  appTopologies: '/docs/app/topologies',
  coreProtocol: '/docs/core/protocol',
  inferenceHardware: '/docs/inference/hardware',
  inferencePrivacy: '/docs/inference/privacy',
} as const;

/**
 * The hosted application, which is a DIFFERENT HOST from this one.
 *
 * `openplate.de` is this site and `beta.openplate.de` is the application, split that way in M194.
 * The front page's one filled action goes here, so this constant is the only place the app's
 * address is written down: a marketing site that links a reader to the wrong host is a marketing
 * site that does not work.
 */
export const APP_URL = 'https://beta.openplate.de';

/**
 * The terms of use, which live in the APPLICATION and not on this site.
 *
 * The legal documents are the app's: `openplate/app/routes/legal/terms.tsx`
 * renders them and the app's imprint names the same operator. The pricing page
 * links a reader there rather than repeating a document that would then have
 * two versions and one date.
 *
 * NOT derived from `APP_URL`: the terms sold against are the CONSUMER
 * instance's on `app.openplate.de`, and `APP_URL` is the beta on
 * `beta.openplate.de`, which is a different instance and not the one a payment
 * is made to.
 */
export const APP_TERMS_URL = 'https://app.openplate.de/terms';

/** Release notes pages. The app's live on GitHub; the core service's are rendered here. */
export const CORE_RELEASES_PATH = '/releases/core';

/** The source repositories. */
export const REPOSITORIES = {
  app: 'https://github.com/LowCarbCheck/openplate',
  sync: 'https://github.com/LowCarbCheck/openplate-core',
  inference: 'https://github.com/LowCarbCheck/openplate-inference',
} as const;

/** The app's own releases are published as GitHub releases, not as a page here. */
export const APP_RELEASES_URL = `${REPOSITORIES.app}/releases`;
