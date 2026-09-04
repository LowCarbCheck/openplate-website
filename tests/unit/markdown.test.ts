/**
 * The markdown reader is the one piece of this site that turns somebody else's
 * file into something we draw, and it runs ONCE, at sync time, with its output
 * committed. A defect here is therefore not a rendering bug: it is fifteen
 * generated modules that quietly say something the source did not.
 *
 * One case per block kind, and one per link shape.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { Block, Inline } from '../../app/lib/docs';
import { spansText } from '../../app/lib/docs';
import { type LinkBase, parseBlocks, parseInline, resolveHref, resolveImageSrc } from '../../scripts/lib/markdown';

const BASE: LinkBase = {
  repo: 'https://github.com/LowCarbCheck/openplate',
  sha: 'abc123',
  dir: 'docs',
  routes: { 'docs/sync.md': '/docs/app/sync', 'PROTOCOL.md': '/docs/sync/protocol' },
  imageRoute: '/docs/images/app',
};

function only(markdown: string): Block {
  const { blocks, dropped } = parseBlocks(markdown, BASE);
  assert.deepEqual(dropped, []);
  assert.equal(blocks.length, 1, `expected one block, got ${blocks.map((block) => block.kind).join(', ')}`);
  // SAFETY: the assertion above fails the test before this line when the
  // reader produced anything other than exactly one block.
  return blocks[0] as Block;
}

describe('parseBlocks', () => {
  it('reads a heading with its level, its anchor and its inline code', () => {
    const block = only('## The `SERVER_SECRET`');
    assert.equal(block.kind, 'heading');
    if (block.kind !== 'heading') return;
    assert.equal(block.level, 2);
    assert.equal(block.text, 'The SERVER_SECRET');
    assert.equal(block.id, 'the-server_secret');
    assert.deepEqual(
      block.spans.map((span) => span.kind),
      ['text', 'code'],
    );
  });

  it('joins a wrapped paragraph into one run', () => {
    const block = only('A sentence that the source\nwrapped at some column.');
    assert.equal(block.kind, 'paragraph');
    if (block.kind !== 'paragraph') return;
    assert.equal(spansText(block.spans), 'A sentence that the source wrapped at some column.');
  });

  it('reads a bullet list and an ordered list', () => {
    const bullets = only('- one\n- two');
    assert.equal(bullets.kind, 'list');
    if (bullets.kind !== 'list') return;
    assert.equal(bullets.ordered, false);
    assert.deepEqual(bullets.items.map(spansText), ['one', 'two']);

    const ordered = only('1. first\n2. second');
    assert.equal(ordered.kind, 'list');
    if (ordered.kind !== 'list') return;
    assert.equal(ordered.ordered, true);
  });

  it('keeps a fence indented under a list item inside that item', () => {
    const block = only('1. run it:\n\n   ```bash\n   pnpm dev\n   ```\n');
    assert.equal(block.kind, 'list');
    if (block.kind !== 'list') return;
    assert.deepEqual(
      block.nested?.map((entry) => entry.item),
      [0],
    );
    assert.deepEqual(block.nested?.[0]?.blocks[0], { kind: 'code', lang: 'bash', text: 'pnpm dev' });
  });

  it('reads a fence with its language', () => {
    const block = only('```json\n{ "a": 1 }\n```');
    assert.deepEqual(block, { kind: 'code', lang: 'json', text: '{ "a": 1 }' });
  });

  it('reads a block quote', () => {
    const block = only('> Never run this in production.');
    assert.equal(block.kind, 'quote');
    if (block.kind !== 'quote') return;
    assert.equal(spansText(block.spans), 'Never run this in production.');
  });

  it('reads a table, header row and body', () => {
    const block = only('| Guide | What it covers |\n| --- | --- |\n| Sync | Across devices |');
    assert.equal(block.kind, 'table');
    if (block.kind !== 'table') return;
    assert.deepEqual(block.head.map(spansText), ['Guide', 'What it covers']);
    assert.deepEqual(
      block.rows.map((row) => row.map(spansText)),
      [['Sync', 'Across devices']],
    );
  });

  it('reads a standalone image line as its own block', () => {
    const block = only('![A topology](images/topology.png)');
    assert.deepEqual(block, { kind: 'image', alt: 'A topology', src: '/docs/images/app/topology.png' });
  });

  it('reports raw HTML rather than mangling it', () => {
    const { blocks, dropped } = parseBlocks('<div align="center">\n  <img src="x.png">\n</div>', BASE);
    assert.deepEqual(blocks, []);
    assert.equal(dropped.length, 1);
    assert.match(dropped[0] ?? '', /raw html <div>/);
  });
});

describe('parseInline', () => {
  it('nests code inside bold instead of printing the markers', () => {
    const spans = parseInline('**Set `PORT` first**', BASE);
    assert.equal(spans.length, 1);
    const strong = spans[0];
    assert.equal(strong?.kind, 'strong');
    if (strong?.kind !== 'strong') return;
    assert.deepEqual(
      strong.spans.map((span: Inline) => span.kind),
      ['text', 'code', 'text'],
    );
  });

  it('leaves an underscore inside a word alone', () => {
    const spans = parseInline('MODEL_RUNTIME_URL', BASE);
    assert.deepEqual(spans, [{ kind: 'text', text: 'MODEL_RUNTIME_URL' }]);
  });
});

describe('resolveHref', () => {
  it('sends a link to a published doc to the route that publishes it', () => {
    assert.equal(resolveHref('sync.md', BASE), '/docs/app/sync');
    assert.equal(resolveHref('sync.md#encryption', BASE), '/docs/app/sync#encryption');
    assert.equal(resolveHref('../PROTOCOL.md', BASE), '/docs/sync/protocol');
  });

  it('sends everything else to the pinned commit, never to a branch', () => {
    assert.equal(
      resolveHref('../docker/compose.yml', BASE),
      'https://github.com/LowCarbCheck/openplate/blob/abc123/docker/compose.yml',
    );
  });

  it('leaves a fragment and an absolute URL alone', () => {
    assert.equal(resolveHref('#backups', BASE), '#backups');
    assert.equal(resolveHref('https://openrouter.ai', BASE), 'https://openrouter.ai');
  });
});

describe('resolveImageSrc', () => {
  it('re-roots an image under its own component', () => {
    assert.equal(resolveImageSrc('images/a.png', BASE), '/docs/images/app/a.png');
  });

  it('leaves an image outside docs/images where the sync can refuse it', () => {
    assert.equal(resolveImageSrc('../logo.png', BASE), '/logo.png');
  });
});
