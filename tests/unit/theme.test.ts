/**
 * The dark palette is written twice in `app/app.css`, and this is what keeps
 * the two copies the same.
 *
 * ── WHY THERE ARE TWO, AND WHY A TEST HAS TO WATCH THEM ──
 * The reader's system chooses the appearance until the reader overrides it, and
 * the override is `data-theme` on `<html>`. A media query cannot read an
 * attribute and an attribute selector cannot read a media query, so dark exists
 * once inside `@media (prefers-color-scheme: dark)` and once under
 * `:root[data-theme='dark']`. Nothing in CSS notices when only one of them is
 * edited: the page still renders, in two slightly different darks depending on
 * how the reader got there, which is exactly the defect nobody reports.
 *
 * The test reads the stylesheet with its own parser rather than importing
 * `readPalettes`. `readPalettes` takes six tokens out of ONE of these blocks;
 * this compares every declaration in BOTH, so a token the diagrams do not use
 * is covered here and a bug in either parser cannot hide a bug in the other.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { TOKENS } from '../../scripts/lib/mermaid';

const APP_CSS = fileURLToPath(new URL('../../app/app.css', import.meta.url));

/** The selector of the dark block the media query carries. */
const MEDIA_DARK = ":root:not([data-theme='light'])";
/** The selector of the dark block the toggle's attribute carries. */
const ATTRIBUTE_DARK = ":root[data-theme='dark']";

/**
 * Every `--token: value;` of the innermost block opened by this selector.
 *
 * Innermost, so `@layer` and `@media` are containers and never candidates, and
 * a block with no custom properties in it is not one either: both dark
 * selectors are also used for a `color-scheme` rule, which declares nothing
 * this compares.
 */
function declarations(css: string, selector: string): Map<string, string> {
  const blocks = [...css.matchAll(/(?<selector>[^{}]*)\{(?<body>[^{}]*)\}/g)]
    .filter((match) => (match.groups?.['selector'] ?? '').trim().replaceAll(/\s+/g, ' ') === selector)
    .map((match) => match.groups?.['body'] ?? '')
    .filter((body) => body.includes('--'));
  assert.equal(blocks.length, 1, `app.css should hold exactly one palette block for ${selector}`);
  const tokens = new Map<string, string>();
  for (const declaration of (blocks[0] ?? '').matchAll(/--(?<name>[\w-]+)\s*:\s*(?<value>[^;]+);/g)) {
    tokens.set(declaration.groups?.['name'] ?? '', (declaration.groups?.['value'] ?? '').trim());
  }
  return tokens;
}

describe('the dark palette, written twice', () => {
  const css = readFileSync(APP_CSS, 'utf8');
  const media = declarations(css, MEDIA_DARK);
  const attribute = declarations(css, ATTRIBUTE_DARK);

  it('declares the same token names in both blocks', () => {
    assert.deepEqual([...media.keys()].toSorted(), [...attribute.keys()].toSorted());
  });

  it('gives every token the same value in both blocks', () => {
    // As one comparison and not a loop of them, so a failure prints both
    // palettes side by side rather than the first token that differs.
    assert.deepEqual(Object.fromEntries(media), Object.fromEntries(attribute));
  });

  it('carries every token the diagrams read', () => {
    for (const token of TOKENS) {
      assert.ok(media.has(token), `the media dark block is missing --${token}`);
      assert.ok(attribute.has(token), `the [data-theme='dark'] block is missing --${token}`);
    }
  });

  it('is a different palette from the light one', () => {
    const light = declarations(css, ':root');
    assert.deepEqual([...light.keys()].toSorted(), [...media.keys()].toSorted(), 'light declares the same names');
    assert.notEqual(light.get('background'), media.get('background'));
  });
});

describe('the appearance rules the toggle depends on', () => {
  const css = readFileSync(APP_CSS, 'utf8');

  it('applies the media dark palette only when the reader has not asked for light', () => {
    // The `:not([data-theme='light'])` IS the override. Without it a reader on a
    // dark system can press the toggle, get `data-theme="light"`, and still be
    // handed the dark tokens by the media query.
    assert.match(css, /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme='light'\]\)/);
  });

  it('sets color-scheme for both overrides, so the scrollbar follows the choice', () => {
    assert.match(css, /:root\[data-theme='light'\]\s*\{\s*color-scheme: light;/);
    assert.match(css, /:root\[data-theme='dark'\]\s*\{\s*color-scheme: dark;/);
  });
});
