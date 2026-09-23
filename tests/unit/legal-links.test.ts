/**
 * The imprint and the privacy notice are the app's pages now (M246), and this site only links to
 * them. Three things have to hold for that to be true, and each can break with every other tier
 * green:
 *
 * 1. No route of this site renders either page, in any language. A row left in the route table
 *    prerenders a page with nothing to say, and the build is happy to write it.
 * 2. The footer, which every page renders, links to the app's absolute URLs. A `SiteLink` to
 *    `/imprint` would be localized into `/en/imprint` and land on the redirect, or on a 404 under a
 *    static server with no nginx in front of it.
 * 3. The old addresses answer. nginx 301s them to the app, and `nginx.conf` cannot import the
 *    constants its targets must equal, so its two lines are read here and held to them.
 *
 * Every matcher here has a control case that feeds it the thing it exists to catch, because a
 * matcher that cannot find anything passes against any tree.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouterProvider, createStaticHandler, createStaticRouter, type RouteObject } from 'react-router';

import { PageFrame } from './lib/page-frame';
import { LEGAL_LINKS } from '../../app/components/site-layout';
import { LANGUAGE_PREFIXES, PREFIXED_LANGUAGES, SUPPORTED_LANGUAGES, type LanguageCode } from '../../app/i18n/language';
import routes from '../../app/routes';
import { buildSitemapXml } from '../../app/sitemap';
import { APP_IMPRINT_URL, APP_TERMS_URL, APP_URL, APP_WEBSITE_PRIVACY_URL, SITE_ORIGIN } from '../../app/site';

const NGINX_CONF = readFileSync(resolve(import.meta.dirname, '../../nginx.conf'), 'utf8');

/** The two slugs that left this site. */
const MOVED = ['imprint', 'privacy'] as const;

/** Every path segment list the route config registers, flattened out of any nesting. */
function routePaths(entries: readonly { path?: string; children?: readonly unknown[] }[]): string[] {
  return entries.flatMap((entry) => {
    const own = entry.path === undefined ? [] : [entry.path];
    // SAFETY: a RouteConfigEntry's children are RouteConfigEntries; the parameter type is narrowed
    // to the two fields read here so the control below can pass a plain object literal.
    const children = (entry.children ?? []) as { path?: string; children?: readonly unknown[] }[];
    return [...own, ...routePaths(children)];
  });
}

/** The registered paths whose last segment is a moved page, in any language. */
function movedRoutes(paths: readonly string[]): string[] {
  return paths.filter((path) => MOVED.some((slug) => path === slug || path.endsWith(`/${slug}`)));
}

/** Every `href` in `markup` that points at a moved page on THIS site, with or without a language. */
function siteRelativeLegalHrefs(markup: string): string[] {
  const hrefs = [...markup.matchAll(/href="([^"]*)"/g)].map((match) => match[1] ?? '');
  return hrefs.filter((href) => /^\/(?:[a-z]{2}\/)?(?:imprint|privacy)\/?$/.test(href));
}

/** The whole page frame, rendered on the server the way the prerender renders it, in `language`. */
async function renderFrame(language: LanguageCode): Promise<string> {
  const pathname = LANGUAGE_PREFIXES[language] === '' ? '/' : `${LANGUAGE_PREFIXES[language]}/`;
  const routeObjects: RouteObject[] = [
    {
      id: 'root',
      path: '/*',
      loader: () => ({ matomoSiteId: null, priceEur: null }),
      Component: () => createElement(PageFrame, { language }),
    },
  ];
  const handler = createStaticHandler(routeObjects);
  const context = await handler.query(new Request(`${SITE_ORIGIN}${pathname}`));
  if (context instanceof Response) throw new Error(`the frame answered ${context.status}, not a page`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(createElement(StaticRouterProvider, { router, context, hydrate: false }));
}

/** One nginx `location ~` line: the regex as written, the same regex compiled, and its 301 target. */
interface NginxRule {
  source: string;
  pattern: RegExp;
  target: string;
}

/** The one nginx `location` line that serves `slug`, split into its pattern and its 301 target. */
function nginxRule(slug: (typeof MOVED)[number]): NginxRule {
  const line = NGINX_CONF.split('\n').find((candidate) => candidate.includes(`)?${slug}/?$`));
  assert.ok(line !== undefined, `nginx.conf has no location for /${slug}`);
  const match = /location ~ (\S+) \{ return 301 (\S+); \}/.exec(line);
  assert.ok(match !== null, `the /${slug} rule is not the one-line regex form this test reads: ${line.trim()}`);
  const [, source = '', target = ''] = match;
  return { source, pattern: new RegExp(source), target };
}

/** Every address a moved page used to answer at: each language, with and without the slash. */
function oldAddresses(slug: string): string[] {
  return SUPPORTED_LANGUAGES.flatMap((language) => {
    const path = `${LANGUAGE_PREFIXES[language]}/${slug}`;
    return [path, `${path}/`];
  });
}

describe('the route table', () => {
  it('registers no imprint or privacy page in any language', () => {
    assert.deepEqual(movedRoutes(routePaths(routes)), []);
  });

  it('control: the matcher finds a moved page at the root, under a prefix and nested', () => {
    const planted = [{ path: 'imprint' }, { path: 'en/privacy' }, { path: 'fr', children: [{ path: 'fr/imprint' }] }];
    assert.deepEqual(movedRoutes(routePaths(planted)), ['imprint', 'en/privacy', 'fr/imprint']);
  });

  it('control: the matcher leaves a page that only contains the word alone', () => {
    assert.deepEqual(movedRoutes(['docs/inference/privacy-notes', 'research']), []);
  });
});

describe('the sitemap', () => {
  const xml = buildSitemapXml();

  it('advertises neither moved page in any language', () => {
    for (const slug of MOVED) {
      for (const address of oldAddresses(slug)) {
        assert.ok(!xml.includes(`<loc>${SITE_ORIGIN}${address}</loc>`), `the sitemap still lists ${address}`);
      }
    }
  });

  it('control: the same check finds a moved page when the path list carries one', () => {
    const planted = buildSitemapXml({ staticPaths: ['/', '/imprint'] });
    assert.ok(planted.includes(`<loc>${SITE_ORIGIN}/imprint</loc>`));
    assert.ok(planted.includes(`<loc>${SITE_ORIGIN}/en/imprint</loc>`));
  });
});

describe('the footer Legal column', () => {
  it('is built from the three app URLs, each derived from APP_URL', () => {
    assert.deepEqual(
      LEGAL_LINKS.map((link) => link.href),
      [APP_IMPRINT_URL, APP_WEBSITE_PRIVACY_URL, APP_TERMS_URL],
    );
    for (const link of LEGAL_LINKS) assert.ok(link.href.startsWith(`${APP_URL}/`), link.href);
    assert.equal(APP_WEBSITE_PRIVACY_URL, `${APP_URL}/privacy/website`);
  });

  for (const language of SUPPORTED_LANGUAGES) {
    it(`links to the app's imprint, website privacy and terms in ${language}, and to no page here`, async () => {
      const markup = await renderFrame(language);
      for (const link of LEGAL_LINKS) {
        assert.ok(markup.includes(`href="${link.href}"`), `${language}: no link to ${link.href}`);
      }
      assert.deepEqual(siteRelativeLegalHrefs(markup), []);
    });
  }

  it('control: the render carries the frame, so an absent link is not an empty page', async () => {
    const markup = await renderFrame('en');
    assert.ok(markup.includes('<footer'), 'the frame rendered no footer');
    assert.ok(markup.includes('>Imprint<'), 'the frame rendered no English imprint label');
  });

  it('control: the href matcher finds a site-relative legal link in every form', () => {
    const planted = '<a href="/imprint">a</a><a href="/en/privacy">b</a><a href="/fr/imprint/">c</a>';
    assert.deepEqual(siteRelativeLegalHrefs(planted), ['/imprint', '/en/privacy', '/fr/imprint/']);
    assert.deepEqual(siteRelativeLegalHrefs(`<a href="${APP_IMPRINT_URL}">d</a><a href="/docs">e</a>`), []);
  });
});

describe('the nginx redirects for the old addresses', () => {
  it('sends every old imprint address to the app imprint', () => {
    const { pattern, target } = nginxRule('imprint');
    assert.equal(target, APP_IMPRINT_URL);
    for (const address of oldAddresses('imprint')) {
      // German has no prefix, so its address is also the one every prefix check below builds on.
      assert.ok(pattern.test(address), `${address} is not redirected`);
    }
  });

  it("sends every old privacy address to the website's privacy notice in the app", () => {
    const { pattern, target } = nginxRule('privacy');
    assert.equal(target, APP_WEBSITE_PRIVACY_URL);
    for (const address of oldAddresses('privacy')) assert.ok(pattern.test(address), `${address} is not redirected`);
  });

  it('names exactly the prefixed languages, so a new language cannot 404 at its old imprint', () => {
    for (const slug of MOVED) {
      const { source } = nginxRule(slug);
      const named = /^\^\/\(\?:\(\?:([a-z|]+)\)\/\)\?/.exec(source)?.[1]?.split('|') ?? [];
      assert.deepEqual(named.toSorted(), [...PREFIXED_LANGUAGES].toSorted());
    }
  });

  it('control: the patterns leave documentation pages and look-alike paths alone', () => {
    for (const slug of MOVED) {
      const { pattern } = nginxRule(slug);
      for (const address of [`/docs/inference/${slug}`, `/${slug}s`, `/xx/${slug}`, `/en/${slug}/website`]) {
        assert.ok(!pattern.test(address), `${address} would be redirected`);
      }
    }
  });
});
