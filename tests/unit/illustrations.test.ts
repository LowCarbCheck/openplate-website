/**
 * The rules the illustrations follow that nothing else in the gate can see.
 *
 * ── WHY A TEST AND NOT A REVIEW ──
 * Three of the four promises `app/components/illustrations/frame.tsx` makes are invisible to the
 * compiler and to the linter, and each one fails silently rather than loudly:
 *
 *   1. A hex value typed into a drawing compiles, lints and renders. It is only wrong in the theme
 *      nobody screenshotted, and it is a fourth teal in a project that exists partly to have one.
 *      `openplate-brand` owns the palette and a member repository never types a colour, so the
 *      check is for the LITERAL, not for the value: there is no correct hex to allow here.
 *   2. A `width` or `height` on the root `<svg>` compiles and renders, and then the drawing stops
 *      being responsive at exactly one breakpoint somebody was not looking at.
 *   3. An em dash or an en dash in a comment passes every tier. The workspace bans both, in copy
 *      and in code alike, and these files are heavily commented.
 *
 * The fourth promise, that the base rule is the finished picture, cannot be tested from here: it is
 * a claim about what a browser paints with motion switched off, and the only instrument for it is
 * a screenshot with `prefers-reduced-motion` set. It is checked by hand.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

/** Addressed from this file, so the test does not depend on the directory the runner started in. */
const FOLDER = fileURLToPath(new URL('../../app/components/illustrations', import.meta.url));

const FILES = readdirSync(FOLDER).filter((name) => name.endsWith('.tsx'));

/** Every colour notation a stylesheet or an SVG attribute accepts, none of which belongs here. */
const COLOUR_LITERAL = /#[\da-f]{3,8}\b|\brgba?\(|\bhsla?\(|\boklch\(/i;

/** The two characters the workspace bans everywhere, including in a comment. */
const BANNED_DASH = /[—–]/;

describe('illustrations', () => {
  it('has drawings to check', () => {
    assert.ok(FILES.length >= 4, `expected the four drawings and their frame, found ${FILES.join(', ')}`);
  });

  for (const name of FILES) {
    const source = readFileSync(`${FOLDER}/${name}`, 'utf8');

    it(`${name} names no colour`, () => {
      const offenders = source
        .split('\n')
        .map((line, index) => ({ line, at: index + 1 }))
        .filter((entry) => COLOUR_LITERAL.test(entry.line));
      assert.deepEqual(
        offenders.map((entry) => `${entry.at}: ${entry.line.trim()}`),
        [],
        'colour comes from currentColor and the CSS tokens, never from a literal',
      );
    });

    it(`${name} sizes nothing in pixels on its root svg`, () => {
      assert.ok(!/<svg[^>]*\swidth=/.test(source), 'a drawing carries a viewBox and is sized by its caller');
      assert.ok(!/<svg[^>]*\sheight=/.test(source), 'a drawing carries a viewBox and is sized by its caller');
    });

    it(`${name} writes no em dash and no en dash`, () => {
      const offenders = source
        .split('\n')
        .map((line, index) => ({ line, at: index + 1 }))
        .filter((entry) => BANNED_DASH.test(entry.line));
      assert.deepEqual(offenders.map((entry) => `${entry.at}: ${entry.line.trim()}`), []);
    });
  }

  it('every drawing carries a viewBox', () => {
    for (const name of FILES.filter((file) => file !== 'frame.tsx')) {
      const source = readFileSync(`${FOLDER}/${name}`, 'utf8');
      assert.match(source, /viewBox/, `${name} must declare a viewBox`);
    }
  });
});
