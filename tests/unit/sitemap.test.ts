/**
 * The sitemap lists the site's pages from its own list of paths, because the
 * route table cannot be imported at runtime (`app/sitemap.ts` says why). These
 * cases are what keeps that copy honest: the two lists are compared here, so a
 * page added to the route table and forgotten in the sitemap fails the gate
 * rather than quietly going unindexed.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SUPPORTED_LANGUAGES, localizePath } from '../../app/i18n/language';
import { docPaths } from '../../app/prerender';
import { PAGES } from '../../app/routes';
import { STATIC_PATHS, buildSitemapXml } from '../../app/sitemap';
import { SITE_ORIGIN } from '../../app/site';

/** Every route whose path has no parameter, in the canonical English-rooted form. */
const staticRoutePaths = PAGES.filter((page) => !page.path?.includes(':')).map((page) =>
  page.path === undefined ? '/' : `/${page.path}`,
);

describe('the sitemap path list', () => {
  it('holds exactly the routes that have no parameter', () => {
    assert.deepEqual([...STATIC_PATHS].toSorted(), staticRoutePaths.toSorted());
  });
});

describe('buildSitemapXml', () => {
  const xml = buildSitemapXml();
  const allPaths = [...STATIC_PATHS, ...docPaths()];

  it('lists every page in every language', () => {
    for (const path of allPaths) {
      for (const language of SUPPORTED_LANGUAGES) {
        assert.ok(
          xml.includes(`<loc>${SITE_ORIGIN}${localizePath(path, language)}</loc>`),
          `missing ${localizePath(path, language)}`,
        );
      }
    }
  });

  it('gives every entry an alternate for each language and an x-default', () => {
    const locations = xml.match(/<loc>/g) ?? [];
    const german = xml.match(/hreflang="de"/g) ?? [];
    const fallbacks = xml.match(/hreflang="x-default"/g) ?? [];

    assert.equal(locations.length, allPaths.length * SUPPORTED_LANGUAGES.length);
    assert.equal(german.length, locations.length);
    assert.equal(fallbacks.length, locations.length);
  });

  it('carries the generated documentation and release pages, not the static ones alone', () => {
    // Named rather than counted: a sitemap that lost every doc URL would still
    // satisfy a count taken from the same list it was built from.
    assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/docs/sync/protocol</loc>`));
    assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/de/releases/app</loc>`));
    assert.ok(docPaths().length > 0);
  });

  it('addresses a German page under its own prefix, not the English one', () => {
    assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/de/sync</loc>`));
    assert.ok(!xml.includes(`${SITE_ORIGIN}/de/de`));
  });
});
