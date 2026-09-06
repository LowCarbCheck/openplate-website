/**
 * The diagram pipeline, from a fence to two committed SVG files.
 *
 * Its own fixtures and not a real document, because it has to test the shapes
 * nobody would commit: a fence with no description, a label that has become a
 * sentence, a diagram mermaid cannot parse. All three exist to FAIL the sync,
 * and a failure that does not happen is invisible until a page ships wrong.
 *
 * The render cases really run a browser. There is no point mocking the one
 * thing this file exists to drive, and an SVG that is well formed and empty is
 * exactly what a mocked render would have produced: every drawing assertion
 * below therefore counts drawn elements, not bytes.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import type { Block } from '../../app/lib/docs';
import { spansText } from '../../app/lib/docs';
import { type LinkBase, parseBlocks } from '../../scripts/lib/markdown';
import { hslToHex, readPalettes, renderDiagrams, themeVariables } from '../../scripts/lib/mermaid';

/** The stylesheet, addressed from this file so the test does not depend on the runner's cwd. */
const APP_CSS = fileURLToPath(new URL('../../app/app.css', import.meta.url));

const BASE: LinkBase = {
  repo: 'https://github.com/LowCarbCheck/openplate',
  sha: 'abc123',
  dir: 'docs',
};

function fence(body: string): string {
  return ['```mermaid', body.trim(), '```'].join('\n');
}

/**
 * The one block a diagram fixture produces, already narrowed.
 *
 * `assert.ok` and not a cast: a fixture that stops being a diagram should fail
 * the test that says so, not be asserted into the shape the rest of the case
 * expects.
 */
function drawn(markdown: string): Extract<Block, { kind: 'diagram' }> {
  const block = parseBlocks(markdown, BASE).blocks[0];
  assert.ok(block !== undefined && block.kind === 'diagram', `expected a diagram, got ${block?.kind ?? 'nothing'}`);
  return block;
}

const GOOD = fence(`
%% alt: The app writes to the sync server, which stores an encrypted snapshot.
graph LR
  App[The app] --> Sync[Sync server]
  Sync --> Store[(Snapshot)]
`);

describe('a mermaid fence, read', () => {
  it('becomes a diagram block whose id is its source and whose alt is prose', () => {
    assert.deepEqual(parseBlocks(GOOD, BASE).problems, []);
    const block = drawn(GOOD);
    assert.match(block.id, /^[\da-f]{12}$/);
    assert.equal(spansText(block.alt), 'The app writes to the sync server, which stores an encrypted snapshot.');
    // The description is NOT in the source, which is what keeps a reworded
    // description from re-rendering and re-committing an unchanged drawing.
    assert.ok(!block.source.includes('%% alt:'));
    assert.ok(block.source.startsWith('graph LR'));
  });

  it('gives the same id to the same drawing and a different one to a changed drawing', () => {
    const first = drawn(GOOD);
    const again = drawn(GOOD.replace('The app writes to', 'The app sends to'));
    const changed = drawn(GOOD.replace('Snapshot', 'Backup'));
    assert.equal(first.id, again.id, 'a reworded description is the same drawing');
    assert.notEqual(first.id, changed.id, 'a changed node is a different drawing');
  });

  it('refuses a fence with no `%% alt:` line', () => {
    const source = fence('graph LR\n  A[App] --> B[Sync]');
    const { problems } = parseBlocks(source, BASE);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /%% alt:/);
    assert.deepEqual(drawn(source).alt, [], 'the sync fails on this, so it must be visibly empty');
  });

  it('refuses a label that has become a sentence', () => {
    const { problems } = parseBlocks(
      fence(`
%% alt: One box explains itself at length.
graph LR
  A[The app writes every change straight to the local store] --> B[Sync]
`),
      BASE,
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /10 words/);
    assert.match(problems[0] ?? '', /carries names, not sentences/);
  });

  it('allows a label of exactly six words', () => {
    const { problems } = parseBlocks(
      fence(`
%% alt: Six words is a label, not a claim.
graph LR
  A[One two three four five six] --> B[Sync]
`),
      BASE,
    );
    assert.deepEqual(problems, []);
  });

  it('refuses a diagram inside a list item', () => {
    const { problems } = parseBlocks(
      ['1. Read the topology:', '', '   ```mermaid', '   %% alt: A box.', '   graph LR', '     A[App]', '   ```'].join(
        '\n',
      ),
      BASE,
    );
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /inside a list item/);
  });

  it('leaves every other fence a fence', () => {
    const { blocks, problems } = parseBlocks('```bash\npnpm sync:docs\n```', BASE);
    assert.deepEqual(problems, []);
    assert.equal(blocks[0]?.kind, 'code');
  });
});

describe('the palette, read out of the stylesheet', () => {
  it('converts an HSL triplet the way a browser does', () => {
    assert.equal(hslToHex('0 0% 100%'), '#ffffff');
    assert.equal(hslToHex('0 0% 0%'), '#000000');
    assert.equal(hslToHex('179 92% 25%'), '#057a78');
    assert.throws(() => hslToHex('oklch(0.2 0 0)'), /not an HSL triplet/);
  });

  it('reads the two appearances the site has and gives mermaid hex for both', () => {
    const palettes = readPalettes(APP_CSS);
    assert.match(palettes.light['background'] ?? '', /^#[\da-f]{6}$/);
    assert.match(palettes.dark['background'] ?? '', /^#[\da-f]{6}$/);
    assert.notEqual(palettes.light['background'], palettes.dark['background']);
    const light = themeVariables(palettes.light);
    assert.equal(light['mainBkg'], palettes.light['card']);
    assert.equal(light['lineColor'], palettes.light['muted-foreground']);
  });
});

describe('a mermaid fence, drawn', () => {
  it('renders a light copy and a dark copy that are real drawings', () => {
    const block = drawn(GOOD);
    const palettes = readPalettes(APP_CSS);
    const rendered = renderDiagrams({
      jobs: [{ id: block.id, source: block.source, where: 'fixture: good.md' }],
      palettes,
    });

    const drawing = rendered.get(block.id);
    assert.ok(drawing !== undefined, 'the diagram was drawn');

    for (const [variant, svg] of [
      ['light', drawing.light],
      ['dark', drawing.dark],
    ] as const) {
      assert.ok(svg.startsWith('<svg'), `${variant} is an SVG`);
      // A DRAWING AND NOT AN EMPTY <svg>. Three nodes and two edges were asked
      // for, so the shapes and the words have to be in there: a well formed
      // empty document is exactly what a broken renderer returns.
      assert.ok((svg.match(/<(?:rect|path|polygon|circle)\b/g) ?? []).length >= 5, `${variant} has shapes`);
      assert.ok(svg.includes('Sync server'), `${variant} carries its labels`);
      assert.ok(svg.length > 2000, `${variant} is not a stub`);
    }
    // The two copies differ, which is the entire reason there are two of them.
    assert.notEqual(drawing.light, drawing.dark);
    assert.ok(drawing.light.includes(palettes.light['card'] ?? 'x'), 'the light copy is in the light palette');
    assert.ok(drawing.dark.includes(palettes.dark['card'] ?? 'x'), 'the dark copy is in the dark palette');
  });

  it('fails with the file named when mermaid cannot parse the fence', () => {
    // `call` IS A RESERVED WORD in mermaid's flowchart grammar, and a node named
    // after it does not parse. A real example, met upstream while these diagrams
    // were being written: a fence that reads perfectly well and is not one.
    assert.throws(
      () =>
        renderDiagrams({
          jobs: [{ id: 'deadbeef0000', source: 'graph LR\n  call --> B[Sync]', where: 'app: docs/broken.md' }],
          palettes: readPalettes(APP_CSS),
        }),
      /app: docs\/broken\.md/,
    );
  });

  it('draws nothing, and starts no browser, when there is nothing to draw', () => {
    assert.equal(renderDiagrams({ jobs: [], palettes: readPalettes(APP_CSS) }).size, 0);
  });
});
