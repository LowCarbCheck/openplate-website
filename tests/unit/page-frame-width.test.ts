/**
 * The header and the footer keep one width and one gutter on every page.
 *
 * The operator saw the header row jump sideways going from the front page to /docs: the docs set
 * the frame to 88rem with a 24 pixel gutter, every other page to 72rem with 20. The website has no
 * browser tier, so this is the regression guard. It renders the real frame at every `PageWidth`,
 * reads the width and gutter classes off the header's and the footer's inner box, and holds them
 * to `FRAME`. On a docs page it also holds the docs grid and the phone's docs bar to it, since a
 * wordmark that stays put above a file list that moved is the same defect.
 *
 * Checked against the old values once, by hand: with the docs frame back at `max-w-[88rem] px-6`
 * the `docs` cases fail. The first case below keeps a control in the file.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouterProvider, createStaticHandler, createStaticRouter, type RouteObject } from 'react-router';

import { WidthFrame } from './lib/width-frame';
import { FRAME } from '../../app/components/frame';
import { PAGE_WIDTHS, type PageWidth } from '../../app/components/site-layout';
import { SITE_ORIGIN } from '../../app/site';

/** The classes that set a box's width, its centring and its side gutter, sorted. */
function frameTokens(classList: string): string[] {
  return classList
    .split(/\s+/)
    .filter((token) => /^(?:[a-z0-9-]+:)*(?:mx-|max-w-|w-full$|px-|pl-|pr-|ps-|pe-)/.test(token))
    .toSorted();
}

/** The class list of the first element after `opening`, or null when the markup has none. */
function classAfter({ markup, opening }: { markup: string; opening: RegExp }): string | null {
  const match = new RegExp(`${opening.source}\\s*<div class="([^"]*)"`).exec(markup);
  return match?.[1] ?? null;
}

async function render(width: PageWidth): Promise<string> {
  const routeObjects: RouteObject[] = [
    {
      id: 'root',
      path: '/*',
      loader: () => ({ matomoSiteId: null, priceEur: null }),
      Component: () => createElement(WidthFrame, { width }),
    },
  ];
  const handler = createStaticHandler(routeObjects);
  const context = await handler.query(new Request(`${SITE_ORIGIN}/en/docs/app/architecture/`));
  if (context instanceof Response) throw new Error(`the frame answered ${context.status}, not a page`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(createElement(StaticRouterProvider, { router, context, hydrate: false }));
}

const EXPECTED = frameTokens(FRAME);

describe('the page frame', () => {
  it('reads a width and a gutter, and tells the old docs frame from the new one', () => {
    // Control: the values the docs used before the fix. If this matcher saw nothing it would pass
    // any tree, so it has to see these as different.
    assert.deepEqual(EXPECTED, ['max-w-6xl', 'mx-auto', 'px-5', 'w-full']);
    assert.notDeepEqual(frameTokens('mx-auto w-full max-w-[88rem] px-6'), EXPECTED);
    assert.notDeepEqual(frameTokens('mx-auto w-full max-w-6xl px-5 sm:px-6'), EXPECTED);
  });

  for (const width of PAGE_WIDTHS) {
    it(`gives the header and the footer the one frame on a ${width} page`, async () => {
      const markup = await render(width);
      const header = classAfter({ markup, opening: /<header[^>]*>/ });
      const footer = classAfter({ markup, opening: /<footer[^>]*>/ });
      assert.notEqual(header, null, 'no header box found');
      assert.notEqual(footer, null, 'no footer box found');
      assert.deepEqual(frameTokens(header ?? ''), EXPECTED, `header on ${width}`);
      assert.deepEqual(frameTokens(footer ?? ''), EXPECTED, `footer on ${width}`);
    });
  }

  it('puts the docs grid and the phone docs bar in the same frame', async () => {
    const markup = await render('docs');
    const grid = /class="([^"]*lg:grid-cols-\[[^"]*)"/.exec(markup)?.[1] ?? null;
    const phoneBar = classAfter({ markup, opening: /<div class="sticky top-0 z-30[^"]*">/ });
    assert.notEqual(grid, null, 'no docs grid found');
    assert.notEqual(phoneBar, null, 'no phone docs bar found');
    assert.deepEqual(frameTokens(grid ?? ''), EXPECTED, 'docs grid');
    assert.deepEqual(frameTokens(phoneBar ?? ''), EXPECTED, 'phone docs bar');
  });
});
