/**
 * The route table, written once and registered once per language.
 *
 * Every page exists at its English path and again under each prefixed
 * language's path (`/de/...`), as two real routes with distinct ids rather than
 * one route with a `:lang` parameter. The reason is the build: `prerender`
 * writes a static file per URL, and a parameterised language would make every
 * page a dynamic route whose paths have to be enumerated by hand anyway.
 *
 * Adding a page means adding one row to PAGES. Adding a language means adding
 * one entry to `LANGUAGE_PREFIXES`; nothing here changes.
 */
import { type RouteConfig, type RouteConfigEntry, index, route } from '@react-router/dev/routes';

import { LANGUAGE_PREFIXES, PREFIXED_LANGUAGES, type LanguageCode } from './i18n/language';

/**
 * `path` is the path relative to the language root. `undefined` means this page
 * IS the language root, so it is registered as the index route.
 *
 * Exported because the sitemap needs the same list and must not drift from it:
 * `tests/unit/sitemap.test.ts` checks the two against each other.
 */
export const PAGES = [
  { id: 'home', path: undefined, file: 'routes/home.tsx' },
  { id: 'app', path: 'app', file: 'routes/app.tsx' },
  { id: 'sync', path: 'sync', file: 'routes/sync.tsx' },
  { id: 'inference', path: 'inference', file: 'routes/inference.tsx' },
  { id: 'docs', path: 'docs', file: 'routes/docs.tsx' },
  { id: 'docs-page', path: 'docs/:component/:slug', file: 'routes/docs.$component.$slug.tsx' },
  { id: 'releases', path: 'releases/:component', file: 'routes/releases.$component.tsx' },
  { id: 'imprint', path: 'imprint', file: 'routes/imprint.tsx' },
  { id: 'privacy', path: 'privacy', file: 'routes/privacy.tsx' },
] as const;

function pagesForDefaultLanguage(): RouteConfigEntry[] {
  return PAGES.map((page) => {
    if (page.path === undefined) return index(page.file, { id: page.id });
    return route(page.path, page.file, { id: page.id });
  });
}

function pagesForPrefixedLanguage(language: LanguageCode): RouteConfigEntry[] {
  // Sliced because LANGUAGE_PREFIXES holds URL prefixes ('/de') while the
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
