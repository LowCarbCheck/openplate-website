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
 * `openplate.de` is this site and `app.openplate.de` is the CONSUMER
 * instance that sells the plan, split from this site in M194 and pointed at
 * the consumer instance rather than the beta in M214. The front page's one
 * filled action goes here, so this constant is the only place the app's
 * address is written down: a marketing site that links a reader to the wrong
 * host is a marketing site that does not work. The beta this replaced,
 * `beta.openplate.de`, is not linked from this site; Stripe reviews the path
 * from the product page to the thing being sold, and that path has to lead
 * to the instance the payment is actually made to.
 */
export const APP_URL = 'https://app.openplate.de';

/**
 * Where a reader signs up, on the hosted application (M253).
 *
 * Anyone can ask for an account there with an email address; the app mails a
 * link, and the link creates the account. Every "sign up" link on this site
 * points here, and it derives from `APP_URL` like the legal links below.
 */
export const APP_SIGN_UP_URL = `${APP_URL}/sign-up`;

/**
 * The legal pages, which live in the APPLICATION and not on this site (M246).
 *
 * The app renders them from markdown files mounted into its container, so the
 * text is kept out of every public repository, this one included. This site
 * links to them and holds no copy: a second copy would be a second version with
 * a second date. The website's own privacy notice is one of those files too,
 * served by the app at `/privacy/website`.
 *
 * All three derive from `APP_URL`, so the one written-down host is still the
 * only place the app's address lives. `nginx.conf` sends the old `/imprint`
 * and `/privacy` paths of this site to the same addresses, and
 * `tests/unit/legal-links.test.ts` holds its targets to these constants,
 * because a config file cannot import them.
 *
 * No language travels with the link: the app picks its language from its own
 * cookie, not from the URL, so a reader who never set one there reads the
 * instance's default language, whatever language this page was in.
 */
export const APP_IMPRINT_URL = `${APP_URL}/imprint`;
export const APP_WEBSITE_PRIVACY_URL = `${APP_URL}/privacy/website`;
export const APP_TERMS_URL = `${APP_URL}/terms`;

/**
 * The address a reader writes to. The research page prints it as its contact.
 *
 * It used to be read off the imprint's operator block, which left this site
 * with the imprint (M246).
 */
export const CONTACT_EMAIL = 'info@sprqvntrs.com';

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
