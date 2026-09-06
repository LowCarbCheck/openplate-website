/**
 * Every claim the landing page makes traces to a document or to the frame bundle, and to nothing else.
 *
 * ── THE RULE ──
 * There are exactly two places a sentence on `/` may come from. Either a member repository wrote it,
 * in which case it arrives through `app/lib/stack-sections.ts` and the page names a section id; or
 * the site wrote it, in which case it is a key in `common.json` and a translator has seen it and a
 * reviewer can read it beside its German. A third source, a sentence typed into the JSX, is a claim
 * about somebody else's software that nobody reviews, that no translation exists for, and that goes
 * stale the day the software changes. The front page had five of those before spec 04.
 *
 * ── WHY SOURCE INSPECTION ──
 * The same reason `example-data-notice.test.ts` gives: nothing renders in this tier, and the rule is
 * about the composition of a route file. Reading the file is reading the thing under test.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import i18n from '../../app/i18n/i18n';
import { SUPPORTED_LANGUAGES } from '../../app/i18n/language';
import { STACK_SECTIONS } from '../../app/lib/stack-sections';

/**
 * The files the front page is made of.
 *
 * The route and the three components it composes, because a sentence typed into `Hero` is on the
 * landing page just as surely as one typed into the route, and the rule is about the page.
 */
const SOURCES = ['app/routes/home.tsx', 'app/components/hero.tsx', 'app/components/feature-grid.tsx'];

function read(path: string): string {
  return readFileSync(resolve(import.meta.dirname, '../..', path), 'utf8');
}

/**
 * Every translation key the page prints, however it names it.
 *
 * Three spellings, because the page uses three: `t('key')` for a plain string, `i18nKey="key"` for a
 * sentence with a link in it, and `...Key: 'key'` for the entries of the feature grid, which pass
 * their keys through a manifest rather than calling `t` at the point they are written.
 */
function keysIn(source: string): string[] {
  const keys = [
    ...source.matchAll(/\bt\('([\w.]+)'\)/g),
    ...source.matchAll(/i18nKey="([\w.]+)"/g),
    ...source.matchAll(/\w*Key: '([\w.]+)'/g),
  ].map((match) => match[1] ?? '');
  return [...new Set(keys)].toSorted();
}

const PAGE = SOURCES.map(read).join('\n');

describe('the keys the landing page prints', () => {
  const keys = keysIn(PAGE);

  it('are more than a handful, or the pattern above has stopped matching', () => {
    assert.ok(keys.length >= 10, `only found ${keys.length} keys, so this file is checking nothing`);
  });

  for (const language of SUPPORTED_LANGUAGES) {
    it(`all resolve to a string in ${language}`, () => {
      // ASKED OF THE REAL i18next INSTANCE, not of the JSON, so this checks the resolution the page
      // performs rather than a second reimplementation of it. `fallbackLng: false` is what makes
      // the German case mean anything: the singleton answers a missing German key in English, which
      // is right for a reader and would let an untranslated page pass here.
      const missing = keys.filter((key) => !i18n.exists(key, { lng: language, fallbackLng: false }));
      assert.deepEqual(missing, [], `${language} has no copy for these`);
    });
  }
});

describe('the sections the landing page quotes', () => {
  /**
   * The section ids the page asks for, spelled the two ways the page spells them.
   *
   * `section(sections, 'whatItIs')` is the direct call. The three stack cards are built from a list
   * and pass `component.id`, so their ids are literals in that list and never appear at the call
   * site: a regex on the call alone reports the three quoted READMEs as unshown.
   */
  const asked = [
    ...new Set([
      ...[...PAGE.matchAll(/section\(sections, '(\w+)'\)/g)].map((match) => match[1] ?? ''),
      ...[...PAGE.matchAll(/\bid: '(\w+)'/g)].map((match) => match[1] ?? ''),
    ]),
  ];
  const declared = STACK_SECTIONS.home.map((entry) => entry.id);

  it('are all declared in the manifest, so each one is cut from a real document', () => {
    const undeclared = asked.filter((id) => !declared.includes(id));
    assert.deepEqual(undeclared, []);
  });

  it('are all of them, so no quoted section is silently dropped from the page', () => {
    // The other direction, and the one that fails quietly. `sync:docs` verifies that every declared
    // section still resolves upstream, so a section nobody renders is a document being checked for
    // a page that has stopped showing it.
    const unshown = declared.filter((id) => !asked.includes(id));
    assert.deepEqual(unshown, []);
  });

  it('includes the topology drawing, which is the point of the page', () => {
    const topology = STACK_SECTIONS.home.find((entry) => entry.id === 'topology');
    assert.ok(topology !== undefined);
    assert.deepEqual(topology.from, { kind: 'doc-lead', slug: 'architecture' });
    assert.ok(asked.includes('topology'));
  });
});

describe('the page itself', () => {
  it('uses no thick left border, which is banned house-wide', () => {
    for (const path of SOURCES) assert.doesNotMatch(read(path), /border-l-[248]/, path);
  });

  it('sends a reader to the application host and not to this one', () => {
    // `openplate.de` is this site and `beta.openplate.de` is the app, split in M194. The constant
    // is what the page uses; a literal here would be the fifth place the address is written down.
    assert.match(read('app/routes/home.tsx'), /href=\{APP_URL\}/);
  });
});
