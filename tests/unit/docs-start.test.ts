/**
 * The docs start page is built from the docs index, and the hand-picked guides exist in it.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DOC_COMPONENTS, type DocsIndex } from '../../app/lib/docs';
import { MAIN_GUIDES, START_HERE, docsStartPage } from '../../app/lib/docs-start';
import { DOCS_INDEX } from '../../src/generated/docs-index';

describe('docsStartPage', () => {
  it('finds every featured guide in the synced index', () => {
    // Throws, naming the slug, the moment one of them is renamed or removed upstream.
    const page = docsStartPage(DOCS_INDEX);
    assert.equal(page.startHere.length, START_HERE.length);
    for (const card of page.cards) assert.equal(card.featured.length, MAIN_GUIDES[card.component].length);
  });

  it('features three or four guides for a component that has that many, and every one otherwise', () => {
    for (const component of DOC_COMPONENTS) {
      const count = MAIN_GUIDES[component].length;
      const available = DOCS_INDEX[component].entries.length;
      assert.ok(count === available || (count >= 3 && count <= 4), `${component} features ${count} of ${available}`);
    }
  });

  it('takes titles, versions and dates from the index, not from the page', () => {
    const renamed: DocsIndex = {
      ...DOCS_INDEX,
      app: {
        ...DOCS_INDEX.app,
        source: { ...DOCS_INDEX.app.source, ref: 'v9.9.9', committedAt: '2030-01-01' },
        entries: DOCS_INDEX.app.entries.map((entry) =>
          entry.slug === 'self-hosting' ? { ...entry, title: 'Renamed upstream' } : entry,
        ),
      },
    };
    const page = docsStartPage(renamed);
    assert.equal(page.startHere[0]?.title, 'Renamed upstream');
    assert.equal(page.startHere[0]?.to, '/docs/app/self-hosting');
    assert.equal(page.cards[0]?.version, 'v9.9.9');
    assert.equal(page.cards[0]?.date, '2030-01-01');
    assert.equal(page.cards[0]?.all.length, DOCS_INDEX.app.entries.length);
  });

  it('fails loudly when a featured guide is gone', () => {
    // Control: the same index minus one featured slug must not render a card with a gap in it.
    const missing: DocsIndex = {
      ...DOCS_INDEX,
      app: { ...DOCS_INDEX.app, entries: DOCS_INDEX.app.entries.filter((entry) => entry.slug !== 'topologies') },
    };
    assert.throws(() => docsStartPage(missing), /app\/topologies/);
  });
});
