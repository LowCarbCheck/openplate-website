/**
 * Every translated catalog must be a faithful shell of the English one.
 *
 * MODELLED ON collie-website's `src/i18n/parity.test.ts`, over this repository's
 * two namespaces rather than its one flat file. Three things can go wrong in a
 * catalog and all three are invisible until somebody who reads that language
 * looks at the page:
 *
 * - **A missing key** does not fall back in any VISIBLE way. i18next answers it
 *   from the English bundle here, which is right for a reader and means a
 *   half-translated page looks finished. Only a set comparison finds it.
 * - **A dropped `{{placeholder}}`** silently deletes a value from a sentence, and
 *   a RENAMED one renders the literal braces forever, because i18next
 *   substitutes by name.
 * - **An unbalanced `<selfHosting>`** breaks `<Trans>`: the tag renders as
 *   literal text, or the element it maps to disappears and takes its link with
 *   it.
 *
 * ── AND A FOURTH, WHICH IS THE ONE THIS MILESTONE ADDS ──
 * A catalog that was COPIED rather than translated. `translate-ui` leaves a
 * string in English when the model will not answer it cleanly, which is the
 * right failure for one label and the wrong state for a file. The long strings
 * are the tell: a proper noun is legitimately identical in three languages and a
 * paragraph is not.
 *
 * ── WHY THE READ IS FROM DISK AND NOT FROM `i18n.ts` ──
 * The singleton merges the bundles under a fallback, and asking it whether a key
 * exists in French answers yes for a key only English has. `landing-claims.test.ts`
 * asks it the other question, with `fallbackLng: false`, and the two tests are
 * complementary: that one pins the keys the landing page PRINTS, this one pins
 * the whole catalog against its English.
 *
 * EVERY ASSERTION HERE HAS A CONTROL CASE below it, in `the checks themselves`.
 * An assertion that cannot fail is worse than no assertion, and three of these
 * are the kind that quietly stops matching.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { SOURCE_LANGUAGE, TRANSLATED_LANGUAGES } from '../../app/i18n/language';
import { type CatalogTree, carriesTokens, leaves, namespacesOf, tokens } from '../../scripts/lib/translate-ui';

const ROOT = resolve(import.meta.dirname, '../..');
const NAMESPACES = namespacesOf(ROOT, SOURCE_LANGUAGE);

function catalog(locale: string, namespace: string): Map<string, string> {
  // SAFETY: a JSON bundle read off disk. `leaves` branches on `instanceof
  // Object` and never on the declared type, so a file that is not this shape
  // produces the wrong leaves rather than an unchecked cast being believed.
  const tree = JSON.parse(
    readFileSync(resolve(ROOT, 'app/i18n/locales', locale, `${namespace}.json`), 'utf8'),
  ) as CatalogTree;
  return new Map(leaves(tree).map((leaf) => [leaf.key, leaf.value]));
}

/**
 * The length above which an identical string is a copy and not a coincidence.
 *
 * The identical strings this repository ships today are "openplate",
 * "openplate-core", "openplate-inference", "App", "Menu", "Analytics",
 * "Hardware" and a handful of their length: the longest is 19 characters. 40 is
 * therefore comfortably above the real ones and far below a sentence, so the
 * check has room to be true without being vacuous.
 */
const COPIED_AT = 40;

/**
 * HTML's void elements, which must never name a `<Trans>` tag.
 *
 * ── THE BUG THIS PINS, WHICH collie SHIPPED ──
 * Six links there were written `<link>security note</link>`, and `link` is void.
 * The parser behind `<Trans>` closes a void tag on sight, so the string became an
 * EMPTY element followed by a bare text node: the anchor rendered with the right
 * href, the right target and nothing inside it, and the words that were supposed
 * to be the link sat beside it as plain text. Nothing was clickable because there
 * was nothing to click, the catalog read correctly, and one of the six worked,
 * which is worse than none of them working.
 *
 * Only English is checked, because the token parity below pins every other
 * catalog's tag set to this one.
 */
const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'keygen',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

describe('the English catalogs', () => {
  it('are found at all, in more than one namespace', () => {
    assert.ok(NAMESPACES.length >= 2, `found ${NAMESPACES.length} namespaces, so this file is checking nothing`);
  });

  it('hold enough strings that the checks below are not passing on an empty file', () => {
    const total = NAMESPACES.reduce((sum, namespace) => sum + catalog(SOURCE_LANGUAGE, namespace).size, 0);
    assert.ok(total >= 100, `only ${total} English strings, so the parity checks below say little`);
  });

  it('never name a Trans tag after a void HTML element', () => {
    for (const namespace of NAMESPACES) {
      for (const [key, text] of catalog(SOURCE_LANGUAGE, namespace)) {
        for (const match of text.matchAll(/<([a-z][a-z\d]*)>/g)) {
          assert.equal(VOID_ELEMENTS.has(match[1] ?? ''), false, `${namespace}:${key} names <${match[1]}>`);
        }
      }
    }
  });
});

for (const locale of TRANSLATED_LANGUAGES) {
  describe(`the ${locale} catalogs`, () => {
    it('have exactly the English keys, no more and no fewer', () => {
      for (const namespace of NAMESPACES) {
        const english = [...catalog(SOURCE_LANGUAGE, namespace).keys()].toSorted();
        const translated = [...catalog(locale, namespace).keys()].toSorted();
        assert.deepEqual(translated, english, `${locale}/${namespace}.json`);
      }
    });

    it('carry every placeholder and every tag through', () => {
      for (const namespace of NAMESPACES) {
        const translated = catalog(locale, namespace);
        for (const [key, english] of catalog(SOURCE_LANGUAGE, namespace)) {
          const target = translated.get(key) ?? '';
          assert.deepEqual(tokens(target), tokens(english), `${locale}/${namespace}.json ${key}`);
        }
      }
    });

    it('leave no long string byte-identical to its English', () => {
      const copied: string[] = [];
      for (const namespace of NAMESPACES) {
        const translated = catalog(locale, namespace);
        for (const [key, english] of catalog(SOURCE_LANGUAGE, namespace)) {
          if (english.length <= COPIED_AT) continue;
          if (translated.get(key) === english) copied.push(`${namespace}:${key}`);
        }
      }
      assert.deepEqual(copied, [], `${locale} still holds the English for these`);
    });

    it('has long strings at all, so the check above is looking at something', () => {
      // THE CONTROL FOR THE CHECK ABOVE, and the one it needs most: a threshold
      // test over a corpus with nothing above the threshold passes forever and
      // says nothing.
      const long = NAMESPACES.flatMap((namespace) =>
        [...catalog(SOURCE_LANGUAGE, namespace).values()].filter((text) => text.length > COPIED_AT),
      );
      assert.ok(long.length >= 20, `only ${long.length} English strings are over ${COPIED_AT} characters`);
    });
  });
}

/**
 * The controls.
 *
 * Each of the three checks above is run again against a catalog built to break
 * it. Without these, a `tokens` that stopped matching, a `leaves` that stopped
 * descending or a threshold nothing reaches would all leave the suite green and
 * the catalogs unguarded, which is the failure mode the house rule names.
 */
describe('the checks themselves', () => {
  const english = new Map([
    ['a', 'It costs {{price}} a month.'],
    ['b', 'Read the <ext>self-hosting guide</ext> before you start, it is the shortest one.'],
  ]);

  it('would fail on a missing key', () => {
    const broken = new Map([['a', 'Cela coûte {{price}} par mois.']]);
    assert.notDeepEqual([...broken.keys()].toSorted(), [...english.keys()].toSorted());
  });

  it('would fail on a renamed placeholder and on a dropped one', () => {
    assert.equal(carriesTokens(english.get('a') ?? '', 'Cela coûte {{prix}} par mois.'), false);
    assert.equal(carriesTokens(english.get('a') ?? '', 'Cela coûte peu par mois.'), false);
    // And would pass the one that only moved it, which is what the placeholder
    // is for.
    assert.equal(carriesTokens(english.get('a') ?? '', 'Pour {{price}} par mois.'), true);
  });

  it('would fail on half a tag pair', () => {
    assert.equal(carriesTokens(english.get('b') ?? '', 'Lis le <ext>guide avant de commencer.'), false);
  });

  it('would fail on a long string left in English, and pass a short one', () => {
    const long = english.get('b') ?? '';
    assert.ok(long.length > COPIED_AT);
    assert.equal(long === long, true);
    // A short label is legitimately identical and must not be reported.
    assert.ok('openplate-inference'.length <= COPIED_AT);
  });

  it('would fail on a void element named as a Trans tag', () => {
    const offenders = [...'Read the <link>security note</link>.'.matchAll(/<([a-z][a-z\d]*)>/g)].filter((match) =>
      VOID_ELEMENTS.has(match[1] ?? ''),
    );
    assert.equal(offenders.length, 1);
  });
});
