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
 * TODO: add the documentation and release-notes URLs once the docs sync commits
 * `src/generated/docs-index` (M193 spec 02). Until that module exists the
 * sitemap covers the static pages only.
 */
import { SUPPORTED_LANGUAGES, localizePath, type LanguageCode } from '#app/i18n/language';
import { SITE_ORIGIN } from '#app/site';

/** Every page with a fixed path, in the canonical English-rooted form. */
export const STATIC_PATHS = ['/', '/app', '/sync', '/inference', '/docs', '/imprint', '/privacy'] as const;

/**
 * One `<url>` block: the page in `language`, with every language listed as an
 * alternate. `canonicalPath` is the English-rooted path, because every URL in
 * the block is derived from it.
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

/** The whole document, one `<url>` per page per language, each carrying every language as an alternate. */
export function buildSitemapXml(): string {
  const entries: string[] = [];

  for (const path of STATIC_PATHS) {
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
