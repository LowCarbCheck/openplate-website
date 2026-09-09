/**
 * The route table, written once and registered once per language.
 *
 * Every page exists at its unprefixed, German path and again under each
 * prefixed language's path (`/en/...`), as two real routes with distinct ids
 * rather than one route with a `:lang` parameter. The reason is the build:
 * `prerender` writes a static file per URL, and a parameterised language would
 * make every page a dynamic route whose paths have to be enumerated by hand
 * anyway.
 *
 * Adding a page means adding one row to ALWAYS_PAGES. Adding a language means
 * adding one entry to `LANGUAGE_PREFIXES`; nothing here changes.
 *
 * ONE PAGE IS NOT IN EVERY BUILD. The pricing page exists only in a build that
 * was given a price, so the table is built by `pagesForPrice()` from the
 * environment rather than written down flat. See `app/pricing-config.ts`.
 */
import { type RouteConfig, type RouteConfigEntry, index, route } from '@react-router/dev/routes';

import { LANGUAGE_PREFIXES, PREFIXED_LANGUAGES, type LanguageCode } from './i18n/language';
import { PRICING_PATH, priceEurFromEnvironment } from './pricing-config';

/**
 * One row of the table. `path` is the path relative to the language root, and
 * `undefined` means this page IS the language root, so it is registered as the
 * index route.
 */
export interface SitePage {
  id: string;
  path: string | undefined;
  file: string;
}

/** Every page that exists in every build, whatever the environment says. */
const ALWAYS_PAGES: SitePage[] = [
  { id: 'home', path: undefined, file: 'routes/home.tsx' },
  { id: 'app', path: 'app', file: 'routes/app.tsx' },
  { id: 'core', path: 'core', file: 'routes/core.tsx' },
  { id: 'inference', path: 'inference', file: 'routes/inference.tsx' },
  { id: 'deploy', path: 'deploy', file: 'routes/deploy.tsx' },
  { id: 'docs', path: 'docs', file: 'routes/docs.tsx' },
  { id: 'docs-page', path: 'docs/:component/:slug', file: 'routes/docs.$component.$slug.tsx' },
  { id: 'releases', path: 'releases/:component', file: 'routes/releases.$component.tsx' },
  { id: 'imprint', path: 'imprint', file: 'routes/imprint.tsx' },
  { id: 'privacy', path: 'privacy', file: 'routes/privacy.tsx' },
];

/** The one conditional page. `app/pricing-config.ts` says why it is conditional. */
const PRICING_PAGE: SitePage = { id: 'pricing', path: PRICING_PATH.slice(1), file: 'routes/pricing.tsx' };

/**
 * The table for a build that was given `priceEur`, or was given no price at all.
 *
 * A function of the price rather than a list read straight out of the
 * environment, so the two answers can both be checked in one test run:
 * `tests/unit/pricing.test.ts` calls it with a price and with null.
 */
export function pagesForPrice(priceEur: string | null): SitePage[] {
  if (priceEur === null) return [...ALWAYS_PAGES];
  return [...ALWAYS_PAGES, PRICING_PAGE];
}

/**
 * The table this build registers.
 *
 * Exported because the sitemap needs the same list and must not drift from it:
 * `tests/unit/sitemap.test.ts` checks the two against each other.
 */
export const PAGES: SitePage[] = pagesForPrice(priceEurFromEnvironment());

function pagesForDefaultLanguage(): RouteConfigEntry[] {
  return PAGES.map((page) => {
    if (page.path === undefined) return index(page.file, { id: page.id });
    return route(page.path, page.file, { id: page.id });
  });
}

function pagesForPrefixedLanguage(language: LanguageCode): RouteConfigEntry[] {
  // Sliced because LANGUAGE_PREFIXES holds URL prefixes ('/en') while the
  // router wants a path segment ('de'). A prefixed language always has one.
  const segment = LANGUAGE_PREFIXES[language].slice(1);

  return PAGES.map((page) => {
    const id = `${page.id}-${language}`;
    if (page.path === undefined) return route(segment, page.file, { id });
    return route(`${segment}/${page.path}`, page.file, { id });
  });
}

export default [
  ...pagesForDefaultLanguage(),
  ...PREFIXED_LANGUAGES.flatMap(pagesForPrefixedLanguage),
  // One file for the whole site, in no language: it lists every page in every
  // language and is registered once, outside PAGES.
  route('sitemap.xml', 'routes/sitemap.xml.ts'),
] satisfies RouteConfig;
