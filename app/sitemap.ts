/**
 * sitemap.ts builds `/sitemap.xml` from the site's own route list.
 *
 * Two things it deliberately does NOT do. It does not crawl `build/client`,
 * because the sitemap is rendered during the same build that writes those
 * files. And it does not read the route table in `app/routes.ts`, because that
 * module imports `@react-router/dev`, which is a build-time dependency. The
 * canonical paths are listed here instead, and `tests/unit/sitemap.test.ts`
 * checks the list against the route table so the two cannot drift.
 *
 * The two parameterised routes are not listed here at all. `docPaths()` already
 * enumerates every documentation and release-notes URL out of
 * `src/generated/docs-index`, because the prerenderer needs the same list to
 * emit their files, and a sitemap that named them a second time would go stale
 * the first time a guide was added upstream.
 */
import { SUPPORTED_LANGUAGES, localizePath, type LanguageCode } from '#app/i18n/language';
import { docPaths } from '#app/prerender';
import { PRICING_PATH, priceEurFromEnvironment } from '#app/pricing-config';
import { SITE_ORIGIN } from '#app/site';

/** Every page with a fixed path that exists in every build, in the canonical unprefixed form. */
const ALWAYS_PATHS = ['/', '/app', '/core', '/inference', '/deploy', '/docs', '/imprint', '/privacy'] as const;

/**
 * The fixed paths of a build that was given `priceEur`, or of one given no price.
 *
 * A page nobody may reach must not be advertised: an unpriced build has no
 * pricing route, so a sitemap naming `/pricing` would send every crawler at a
 * 404. A function of the price for the same reason `pagesForPrice()` in
 * `app/routes.ts` is one, and checked against it in `tests/unit/pricing.test.ts`.
 */
export function staticPathsForPrice(priceEur: string | null): string[] {
  if (priceEur === null) return [...ALWAYS_PATHS];
  return [...ALWAYS_PATHS, PRICING_PATH];
}

/** Every page with a fixed path in THIS build. */
export const STATIC_PATHS: string[] = staticPathsForPrice(priceEurFromEnvironment());

/**
 * One `<url>` block: the page in `language`, with every language listed as an
 * alternate. `canonicalPath` is the unprefixed path, because every URL in the
 * block is derived from it.
 */
function urlEntry(page: { canonicalPath: string; language: LanguageCode }): string {
  const { canonicalPath, language } = page;
  const alternates = SUPPORTED_LANGUAGES.map(
    (alternate) =>
      `    <xhtml:link rel="alternate" hreflang="${alternate}" href="${SITE_ORIGIN}${localizePath(canonicalPath, alternate)}" />`,
  );

  const lines = [
    '  <url>',
    `    <loc>${SITE_ORIGIN}${localizePath(canonicalPath, language)}</loc>`,
    ...alternates,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${canonicalPath}" />`,
    '  </url>',
  ];

  return lines.join('\n');
}

/**
 * The whole document, one `<url>` per page per language, each carrying every language as an alternate.
 *
 * `staticPaths` defaults to this build's list and is a parameter only so a test
 * can render the document a priced build would write without setting a variable
 * and re-importing the module. `/sitemap.xml` passes nothing.
 */
export function buildSitemapXml(options: { staticPaths?: readonly string[] } = {}): string {
  const { staticPaths = STATIC_PATHS } = options;
  const entries: string[] = [];

  // The generated pages come first in the file only because they come last in
  // the list; order carries no meaning to a crawler.
  for (const path of [...staticPaths, ...docPaths()]) {
    for (const language of SUPPORTED_LANGUAGES) {
      entries.push(urlEntry({ canonicalPath: path, language }));
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
