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

  it('lists every page in every language', () => {
    for (const path of STATIC_PATHS) {
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

    assert.equal(locations.length, STATIC_PATHS.length * SUPPORTED_LANGUAGES.length);
    assert.equal(german.length, locations.length);
    assert.equal(fallbacks.length, locations.length);
  });

  it('addresses a German page under its own prefix, not the English one', () => {
    assert.ok(xml.includes(`<loc>${SITE_ORIGIN}/de/sync</loc>`));
    assert.ok(!xml.includes(`${SITE_ORIGIN}/de/de`));
  });
});
