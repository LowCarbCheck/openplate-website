/**
 * The four things that must be true of the UI translation pipeline: it finds the
 * leaves, it refuses to pay for the ones that are not prose, it refuses an answer
 * that lost an interpolation, and an unchanged string costs nothing twice.
 *
 * ── THE FETCH IS NEVER REACHED ──
 * Nothing here calls `translate`, so nothing here can spend. What is exercised is
 * the code either side of the request: the flattener, the skip rule, the token
 * check the answer has to pass, and the memory round trip. The model is the one
 * part no test can assert anything about.
 *
 * ── EVERY ASSERTION HAS A CONTROL ──
 * The house rule is that an assertion which cannot fail is worse than no
 * assertion. Each case below therefore carries the negative beside the positive:
 * the skip cases name a value that is NOT skipped, the token cases name a
 * translation that IS accepted, and the memory case asserts the second run is
 * empty only after asserting the first run was not.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { type Memory, hash } from '../../app/lib/docs-i18n.server';
import { SOURCE_LANGUAGE } from '../../app/i18n/language';
import { type Usage, chunk, loadMemory, lookup, saveMemory } from '../../scripts/lib/translate';
import {
  type CatalogTree,
  type TranslateFn,
  type UnitOfLeaf,
  buy,
  carriesTokens,
  catalogPath,
  collectByPath,
  isKeyedByEnglish,
  leaves,
  memoAt,
  namespacesOf,
  pathOf,
  readCatalog,
  rebuildByPath,
  rekeyByPath,
  saveCatalog,
  skipReason,
  tokens,
  unitKey,
  usable,
} from '../../scripts/lib/translate-ui';

const ROOT = resolve(import.meta.dirname, '../..');

/** The memory for `units`, every one answered with a marked copy of its English. */
function answered(units: UnitOfLeaf[], locale: string): Memory {
  return Object.fromEntries(
    units.map((unit) => [unit.hash, memoAt({ unit, target: `${locale.toUpperCase()} ${unit.source}`, locale, at: '2026-09-14' })]),
  );
}

const TREE: CatalogTree = {
  site: {
    name: 'openplate',
    tagline: 'An open-source food diary that runs on your device.',
    nav: { docs: 'Docs' },
  },
  pages: {
    pricing: { price: '{{price}}', year: '2026' },
    home: { body: 'Read the <selfHosting>self-hosting guide</selfHosting> before you start.' },
  },
};

describe('the flattener', () => {
  it('names every leaf by its dotted path, in the file order', () => {
    assert.deepEqual(
      leaves(TREE).map((leaf) => leaf.key),
      ['site.name', 'site.tagline', 'site.nav.docs', 'pages.pricing.price', 'pages.pricing.year', 'pages.home.body'],
    );
  });

  it('carries the value across untouched, markup and all', () => {
    const body = leaves(TREE).find((leaf) => leaf.key === 'pages.home.body');
    assert.equal(body?.value, 'Read the <selfHosting>self-hosting guide</selfHosting> before you start.');
  });

  it('descends, so a nested branch is not reported as a leaf', () => {
    // THE CONTROL for the two above: a flattener that stopped at the top level
    // would report `site` and `pages` as leaves and would still pass a test that
    // only asked for `site.name`.
    const keys = new Set(leaves(TREE).map((leaf) => leaf.key));
    assert.equal(keys.has('site'), false);
    assert.equal(keys.has('pages'), false);
    assert.equal(keys.has('site.nav.docs'), true);
  });
});

describe('the skip rule', () => {
  it('skips a value that is nothing but a placeholder', () => {
    assert.equal(skipReason('{{price}}'), 'placeholder-only');
    assert.equal(skipReason('{{count}} {{unit}}'), 'placeholder-only');
  });

  it('skips a value with no letter in it', () => {
    assert.equal(skipReason('2026'), 'number');
    assert.equal(skipReason('16:8'), 'number');
    assert.equal(skipReason('1.6 / 0.83'), 'number');
  });

  it('skips a value whose every word is a name the style prompt already pins to English', () => {
    assert.equal(skipReason('openplate'), 'proper-noun');
    assert.equal(skipReason('openplate-core'), 'proper-noun');
    assert.equal(skipReason('GitHub'), 'proper-noun');
    assert.equal(skipReason('Docker'), 'proper-noun');
  });

  it('sends a value that is prose, which is what makes the three rules above mean anything', () => {
    // THE CONTROLS. Each one is a near miss of the rule above it: a sentence
    // that CONTAINS a placeholder, a sentence that contains a number, and a
    // label that opens with a product name. A rule that skipped any of these
    // would leave the site's own copy untranslated while every case above still
    // passed.
    assert.equal(skipReason('Starts at {{price}} a month.'), null);
    assert.equal(skipReason('The last 7 days'), null);
    assert.equal(skipReason('openplate app server'), null);
    assert.equal(skipReason('Read the <selfHosting>self-hosting guide</selfHosting>.'), null);
    assert.equal(skipReason('App'), null);
  });

  it('leaves the skipped leaves out of the collection and keeps the prose', () => {
    const units = collectByPath('common', TREE).map((unit) => unit.key).toSorted();
    assert.deepEqual(units, ['common:pages.home.body', 'common:site.nav.docs', 'common:site.tagline']);
  });

  it('counts two units for two keys that hold the same English, one per path', () => {
    // The app's catalog is why: "Fasten" and "Fasten läuft" were one English
    // word under two keys, and a memory keyed by the English alone gave both
    // keys one of them. See "keyed by path and English" in the library.
    const twice: CatalogTree = { a: { one: 'Release notes' }, b: { two: 'Release notes' } };
    const units = collectByPath('common', twice);
    assert.equal(units.length, 2);
    assert.notEqual(units[0]?.hash, units[1]?.hash);
    // THE CONTROL: the same English under the same path in two namespaces is
    // still two keys, and the same English under the same path and namespace
    // is one key, so the line above is not passing because every hash differs.
    assert.notEqual(unitKey(pathOf('common', 'a'), 'Release notes'), unitKey(pathOf('docs', 'a'), 'Release notes'));
    assert.equal(unitKey(pathOf('common', 'a'), 'Release notes'), unitKey(pathOf('common', 'a'), 'Release notes'));
  });
});

describe('the interpolation check', () => {
  it('reads a named placeholder and both halves of a tag pair', () => {
    assert.deepEqual(tokens('Read the <ext>guide</ext> for {{price}}.'), ['</ext>', '<ext>', '{{price}}']);
  });

  it('accepts a translation that moved a placeholder and a tag to the other end', () => {
    const source = 'Read the <ext>guide</ext>, it costs {{price}}.';
    const moved = 'Für {{price}} kannst du den <ext>Leitfaden</ext> lesen.';
    assert.equal(carriesTokens(source, moved), true);
    assert.equal(usable(source, moved), true);
  });

  it('rejects a translation that dropped a placeholder', () => {
    const source = 'It costs {{price}} a month.';
    assert.equal(usable(source, 'Es kostet monatlich.'), false);
  });

  it('rejects a translation that renamed a placeholder', () => {
    // THE ONE THAT LOOKS RIGHT. `{{prix}}` reads as a translation and renders as
    // the literal characters `{{prix}}` on the page forever, because i18next
    // substitutes by name.
    const source = 'It costs {{price}} a month.';
    assert.equal(usable(source, 'Cela coûte {{prix}} par mois.'), false);
  });

  it('rejects a translation that dropped half of a tag pair', () => {
    const source = 'Read the <ext>guide</ext> first.';
    assert.equal(usable(source, 'Lies zuerst den <ext>Leitfaden.'), false);
  });

  it('rejects a translation carrying a dash the house style bans, and takes an empty answer as a failure', () => {
    // BUILT FROM A CODE POINT rather than typed. The workspace bans an em dash
    // and an en dash everywhere, including in a test, and this file would
    // otherwise be the one place the ban is broken by the check that enforces
    // it. U+2014 is the em dash.
    const em = String.fromCodePoint(0x2014);
    assert.equal(usable('It costs money.', `Es kostet Geld ${em} viel Geld.`), false);
    assert.equal(usable('It costs money.', ''), false);
    // THE CONTROL for both: the same sentence written with a comma is stored.
    assert.equal(usable('It costs money.', 'Es kostet Geld, viel Geld.'), true);
  });
});

/** A throwaway directory, so a memory round trip writes nothing the repository keeps. */
function scratch(): string {
  const dir = mkdtempSync(resolve(tmpdir(), 'translate-ui-'));
  mkdirSync(resolve(dir, 'memory'), { recursive: true });
  return dir;
}

describe('the memory round trip', () => {
  it('answers the second run for free and reports the first run as a miss', () => {
    const dir = scratch();
    const file = resolve(dir, 'memory/fr.json');
    const units = collectByPath('common', TREE);

    // FIRST RUN: an empty memory, so everything prose is a miss. Asserted, so
    // the emptiness below cannot pass by the collection being empty too.
    const before = lookup(loadMemory(file), 'fr');
    assert.equal(before.size, 0);
    assert.equal(units.filter((unit) => !before.has(unit.hash)).length, 3);

    assert.equal(saveMemory(file, answered(units, 'fr'), true), 'written');

    // SECOND RUN: read back off disk, nothing is missing.
    const after = lookup(loadMemory(file), 'fr');
    assert.equal(after.size, 3);
    assert.deepEqual(
      units.filter((unit) => !after.has(unit.hash)).map((unit) => unit.key),
      [],
    );
  });

  it('makes one edited English string one miss and leaves the rest answered', () => {
    const dir = scratch();
    const file = resolve(dir, 'memory/fr.json');
    const units = collectByPath('common', TREE);
    saveMemory(file, answered(units, 'fr'), true);
    const done = lookup(loadMemory(file), 'fr');

    const edited: CatalogTree = { ...TREE, site: { name: 'openplate', tagline: 'A rewritten tagline.', nav: { docs: 'Docs' } } };
    const misses = collectByPath('common', edited).filter((unit) => !done.has(unit.hash));
    assert.deepEqual(
      misses.map((unit) => unit.key),
      ['common:site.tagline'],
    );
  });

  it('writes the bundle in the English key order, the memory first and the held value second', () => {
    const dir = scratch();
    const file = resolve(dir, 'fr.json');
    // The existing French bundle: a hand-written tagline, and the proper noun
    // left in English where the skip rule put it.
    const held: CatalogTree = {
      site: { name: 'openplate', tagline: 'Un journal alimentaire.', nav: { docs: 'Docs FR' } },
      pages: { pricing: { price: '{{price}}', year: '2026' }, home: { body: 'EN body' } },
    };
    writeFileSync(file, `${JSON.stringify(held, null, 2)}\n`, 'utf8');

    const bought = new Map([
      [unitKey(pathOf('common', 'pages.home.body'), 'Read the <selfHosting>self-hosting guide</selfHosting> before you start.'), 'FR body'],
    ]);
    assert.equal(saveCatalog(file, rebuildByPath('common', TREE, bought, held), true), 'written');

    const written = readCatalog(file);
    assert.deepEqual(
      leaves(written).map((leaf) => leaf.key),
      leaves(TREE).map((leaf) => leaf.key),
    );
    const byKey = new Map(leaves(written).map((leaf) => [leaf.key, leaf.value]));
    // The memory wins where it has an answer.
    assert.equal(byKey.get('pages.home.body'), 'FR body');
    // The hand-written value survives a run that did not buy it. This is the one
    // that stops a pipeline from overwriting reviewed copy.
    assert.equal(byKey.get('site.tagline'), 'Un journal alimentaire.');
    assert.equal(byKey.get('site.nav.docs'), 'Docs FR');
    // A skipped leaf keeps whatever the bundle held.
    assert.equal(byKey.get('site.name'), 'openplate');
    // And a second write of the same content touches nothing.
    assert.equal(saveCatalog(file, rebuildByPath('common', TREE, bought, held), true), 'unchanged');
    // THE CONTROL for the keying: the same answer filed under the English alone,
    // the old key, is not read, so a memory in the old shape answers nothing.
    const byEnglish = new Map([[hash('Read the <selfHosting>self-hosting guide</selfHosting> before you start.'), 'FR body']]);
    const ignored = new Map(leaves(rebuildByPath('common', TREE, byEnglish, held)).map((leaf) => [leaf.key, leaf.value]));
    assert.equal(ignored.get('pages.home.body'), 'EN body');
  });

  it('falls back to the English for a key the target bundle has never had', () => {
    const dir = scratch();
    const file = resolve(dir, 'fr.json');
    const held: CatalogTree = { site: { name: 'openplate' } };
    writeFileSync(file, `${JSON.stringify(held, null, 2)}\n`, 'utf8');
    saveCatalog(file, rebuildByPath('common', TREE, new Map(), held), true);
    const byKey = new Map(leaves(readCatalog(file)).map((leaf) => [leaf.key, leaf.value]));
    assert.equal(byKey.get('site.tagline'), 'An open-source food diary that runs on your device.');
  });

  it('refuses to write a changed bundle when it may not, and still reports an unchanged one', () => {
    const dir = scratch();
    const file = resolve(dir, 'fr.json');
    writeFileSync(file, `${JSON.stringify(TREE, null, 2)}\n`, 'utf8');
    assert.equal(saveCatalog(file, TREE, false), 'unchanged');
    const changed: CatalogTree = { ...TREE, site: { name: 'openplate', tagline: 'Moved.', nav: { docs: 'Docs' } } };
    assert.equal(saveCatalog(file, changed, false), 'refused');
    // And the file on disk is untouched by the refusal.
    assert.equal(readFileSync(file, 'utf8'), `${JSON.stringify(TREE, null, 2)}\n`);
  });
});

/** One old-keyed memory, hand-built from the fixture, as the first `--adopt` wrote it. */
function oldKeyed(units: UnitOfLeaf[], locale: string, target: (unit: UnitOfLeaf) => string): Memory {
  return Object.fromEntries(
    units.map((unit) => [hash(unit.source), { en: unit.source, model: 'hand-written', at: '2026-09-01', [locale]: target(unit) }]),
  );
}

/**
 * The move from `hash(english)` to `hash(path + english)`, proven on the real
 * committed memory and bundles rather than on a fixture, because the thing at
 * risk is a translation a person wrote and this repository holds them.
 *
 * ── WHAT "LOSES NOTHING" MEANS, AS AN ASSERTION ──
 * Every prose leaf of every namespace, in every translated language, rebuilt
 * from the RE-KEYED MEMORY ALONE, with the English tree standing in for the
 * bundle on disk so a hand-written value cannot be read from there, is the
 * byte the committed bundle holds. The control: the same rebuild from an empty
 * memory is not, so the assertion is reading the memory and not the fallback.
 */
describe('the memory, keyed by path', () => {
  const NAMESPACES = namespacesOf(ROOT, SOURCE_LANGUAGE);
  const ENGLISH = NAMESPACES.map((namespace) => ({
    namespace,
    english: readCatalog(catalogPath(ROOT, SOURCE_LANGUAGE, namespace)),
  }));
  /** The languages whose UI memory and bundles are both committed today. */
  const ADOPTED = ['de', 'fr'];

  it('is keyed by path plus English, so one English under two paths is two entries, each with its own answer', () => {
    const twice: CatalogTree = { nav: { fasting: 'Fasting' }, card: { eyebrow: 'Fasting' } };
    const held: CatalogTree = { nav: { fasting: 'Fasten' }, card: { eyebrow: 'Fasten läuft' } };
    const before = oldKeyed(collectByPath('common', twice), 'de', () => 'Fasten läuft');
    // THE OLD KEYING'S DEFECT, reproduced: one entry, and the nav label reads the card's eyebrow.
    assert.equal(Object.keys(before).length, 1);

    const after = rekeyByPath(before, 'de', [{ namespace: 'common', english: twice, target: held }], '2026-09-14');
    assert.equal(Object.keys(after).length, 2);
    const rebuilt = leaves(rebuildByPath('common', twice, lookup(after, 'de'), twice));
    assert.deepEqual(rebuilt.map((leaf) => leaf.value), ['Fasten', 'Fasten läuft']);
    // Every entry now names its path, and the old key is gone.
    assert.equal(Object.values(after).every((entry) => !isKeyedByEnglish(entry)), true);
    assert.equal(after[hash('Fasting')], undefined);
  });

  it('keeps the provenance of an answer it inherited and stamps a hand edit as hand-written today', () => {
    const units = collectByPath('common', TREE);
    const before = oldKeyed(units, 'fr', (unit) => `FR ${unit.source}`);
    // The bundle on disk agrees with the memory on two leaves and was hand-edited on the third.
    const target: CatalogTree = {
      site: { name: 'openplate', tagline: 'FR An open-source food diary that runs on your device.', nav: { docs: 'Docs à la main' } },
      pages: { pricing: { price: '{{price}}', year: '2026' }, home: { body: 'FR Read the <selfHosting>self-hosting guide</selfHosting> before you start.' } },
    };
    const after = rekeyByPath(before, 'fr', [{ namespace: 'common', english: TREE, target }], '2026-09-14');
    const tagline = after[unitKey(pathOf('common', 'site.tagline'), 'An open-source food diary that runs on your device.')];
    assert.equal(tagline?.at, '2026-09-01');
    assert.equal(tagline?.fr, 'FR An open-source food diary that runs on your device.');
    const docs = after[unitKey(pathOf('common', 'site.nav.docs'), 'Docs')];
    assert.equal(docs?.fr, 'Docs à la main');
    assert.equal(docs?.at, '2026-09-14');
    assert.equal(docs?.model, 'hand-written');
    // And running it again over the result changes nothing: an entry with a path is kept as it is.
    assert.deepEqual(rekeyByPath(after, 'fr', [{ namespace: 'common', english: TREE, target }], '2026-12-31'), after);
  });

  for (const locale of ADOPTED) {
    it(`rebuilds the committed ${locale} bundles byte for byte from the memory keyed by path, and not from the fallback`, () => {
      const memory = loadMemory(resolve(ROOT, 'src/generated/ui-i18n', `${locale}.json`));
      const catalogs = ENGLISH.map((entry) => ({
        namespace: entry.namespace,
        english: entry.english,
        target: readCatalog(catalogPath(ROOT, locale, entry.namespace)),
      }));
      const rekeyed = rekeyByPath(memory, locale, catalogs, '2026-09-14');
      const done = lookup(rekeyed, locale);
      assert.equal(Object.values(rekeyed).every((entry) => !isKeyedByEnglish(entry)), true);

      for (const { namespace, english, target } of catalogs) {
        const committed = readFileSync(catalogPath(ROOT, locale, namespace), 'utf8');
        // The English tree stands in for the bundle on disk, so every prose
        // value below is the memory's answer or the English, never a value
        // read back from the file it is being compared with.
        const fromMemory = `${JSON.stringify(rebuildByPath(namespace, english, done, english), null, 2)}\n`;
        const held = new Map(leaves(target).map((leaf) => [leaf.key, leaf.value]));
        for (const leaf of leaves(rebuildByPath(namespace, english, done, english))) {
          if (skipReason(leaf.value) !== null && leaf.value === held.get(leaf.key)) continue;
          assert.equal(leaf.value, held.get(leaf.key), `${locale} ${pathOf(namespace, leaf.key)}`);
        }
        // The whole file, with the bundle's own skipped leaves standing where they stand today.
        assert.equal(`${JSON.stringify(rebuildByPath(namespace, english, done, target), null, 2)}\n`, committed);
        // THE CONTROL: an empty memory does not reproduce the file from the English alone.
        const fromNothing = `${JSON.stringify(rebuildByPath(namespace, english, new Map(), english), null, 2)}\n`;
        assert.notEqual(fromNothing, committed);
        assert.notEqual(fromNothing, fromMemory);
      }
    });
  }
});

describe('the namespaces', () => {
  it('are read off the English directory rather than listed in the script', () => {
    const found = namespacesOf(ROOT, 'en');
    assert.deepEqual(found, ['common', 'docs']);
  });
});

/**
 * Mirrors the CLI's own purchase loop: for each bundle group, chunk its
 * units and buy every batch under that bundle. A group with no units
 * contributes zero batches and so zero calls to the seam -- the same
 * `for (const batch of group.batches)` structure `scripts/translate-ui.ts`
 * runs for real, built from the same exported `chunk` and `buy`.
 */
async function buyGroups(groups: { bundle: string; units: UnitOfLeaf[] }[], translateFn: TranslateFn): Promise<void> {
  const total: Usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
  const done = new Map<string, string>();
  for (const group of groups) {
    for (const batch of chunk(group.units, 30)) {
      await buy(batch, group.bundle, 'test-key', 'de', done, total, [], translateFn);
    }
  }
}

describe('buy: one translate call per bundle', () => {
  it('makes one translate call per bundle that has pending strings', async () => {
    const commonUnit: UnitOfLeaf = { hash: 'c1', source: 'Save changes', key: 'common.save' };
    const legalUnit: UnitOfLeaf = { hash: 'l1', source: 'These terms apply to you.', key: 'legal.intro' };

    // BOTH BUNDLES HAVE MISSES: exactly two calls, one per bundle, common first
    // because the CLI's own group order is common, then legal.
    const both: string[] = [];
    const stubBoth: TranslateFn = async (units, _locale, bundle) => {
      both.push(bundle);
      return units.map((unit) => `X ${unit.source}`);
    };
    await buyGroups(
      [
        { bundle: 'common', units: [commonUnit] },
        { bundle: 'legal', units: [legalUnit] },
      ],
      stubBoth,
    );
    assert.deepEqual(both, ['common', 'legal']);
    // CONTROL: if `buy` dropped its own `bundle` argument and forwarded a
    // hardcoded value to `translate` instead, both calls above would read the
    // same bundle. The sequence assertion already fails on that defect; this
    // makes the failure mode explicit rather than leaving it to be inferred.
    assert.notEqual(both[0], both[1]);

    // ONLY `common` HAS MISSES: an empty `legal` group chunks to zero
    // batches, so the seam is called exactly once, for `common`.
    const commonOnly: string[] = [];
    const stubCommonOnly: TranslateFn = async (units, _locale, bundle) => {
      commonOnly.push(bundle);
      return units.map((unit) => `X ${unit.source}`);
    };
    await buyGroups(
      [
        { bundle: 'common', units: [commonUnit] },
        { bundle: 'legal', units: [] },
      ],
      stubCommonOnly,
    );
    assert.deepEqual(commonOnly, ['common']);
  });
});
