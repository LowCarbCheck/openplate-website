/**
 * translate-ui, machine-translate the site's own UI catalogs into one language.
 *
 * The sibling of `translate-docs.ts`, over a different corpus. The documentation
 * is quoted from three repositories and parsed into a block tree; this is
 * `app/i18n/locales/en/*.json`, the strings the site writes about itself. Same
 * client, same model, same style contract, same memory discipline, same exit
 * codes.
 *
 *   pnpm translate:ui --locale fr --dry              # count and price the misses, spend nothing
 *   pnpm translate:ui --locale fr                    # buy them. CI only, see WRITABLE
 *   pnpm translate:ui --locale fr --local            # ... or override that, deliberately
 *   pnpm translate:ui --locale fr --budget 0.05      # approve a spend over the default ceiling
 *   pnpm translate:ui --locale fr --adopt            # record today's hand-written bundle, buy nothing
 *
 * ── EXIT CODES, BECAUSE THE WORKFLOW READS THEM ──
 *   0  done, or nothing to do
 *   1  broken: no key, no rate, a memory it may not write, a banned dash in the memory
 *   2  refused on cost. Nothing was sent, or what was sent is saved and the rest is not coming.
 *
 * Two is not a failure of the site. The English is correct and current and
 * should still ship; only the translation waits for someone to approve the
 * number.
 *
 * ── WHAT IS NEVER SENT ──
 * A leaf that is a bare proper noun, a number, or nothing but placeholders is
 * skipped and keeps whatever the target bundle already holds. `skipReason` in
 * `scripts/lib/translate-ui.ts` is the rule and its header is the argument for
 * it; `tests/unit/translate-ui.test.ts` is the control.
 *
 * ── THE MEMORY IS ITS OWN FILE, NEVER THE DOCS' ──
 * `src/generated/ui-i18n/<locale>.json`, beside `docs-i18n/` and never inside
 * it. The two corpora are bought on different schedules by different workflows,
 * and one file written by two jobs is the conflict nobody can adjudicate, which
 * is the whole reason the memory has one writer in the first place.
 *
 * ── `--adopt`, AND WHY IT IS A FLAG AND NOT THE DEFAULT ──
 * German and French were hand-written before this script existed. A first
 * ordinary run would see an empty memory, call all of it a miss, buy it, and
 * replace a reviewed translation with a machine one. `--adopt` records the
 * bundle as it stands today, keyed by the hash of the English it translates and
 * stamped `hand-written`, so nothing is bought and nothing is overwritten. From
 * then on the memory is the record: edit an English string and its hash stops
 * matching, that ONE key becomes a miss, and the next run buys that one string.
 *
 * It cannot be the default, and this is the trap it exists to avoid. Adopting on
 * every run would pair the hash of the NEW English with the target's OLD
 * sentence and call the key done, so an edited string would never be re-bought
 * and the pipeline would be green and useless.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { type Memory, hash } from '../app/lib/docs-i18n.server';
import { SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from '../app/i18n/language';
import {
  CHUNK,
  MODEL,
  type Usage,
  chunk,
  dashOffenders,
  loadMemory,
  lookup,
  memo,
  price,
  saveMemory,
} from './lib/translate';
import {
  type CatalogTree,
  type UnitOfLeaf,
  bundleForNamespace,
  buy,
  catalogPath,
  collectLeaves,
  leaves,
  namespacesOf,
  readCatalog,
  saveCatalog,
  skipReason,
  withTranslations,
} from './lib/translate-ui';

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
}

const ROOT = resolve(import.meta.dirname, '..');
const LOCALE = flag('locale') ?? 'de';
// Both spellings. `translate-docs` takes `--dry-run` and the shorter one is what
// a hand reaches for; refusing it would be a run that spends money because an
// operator typed four fewer characters.
const DRY = args.includes('--dry') || args.includes('--dry-run');
const ADOPT = args.includes('--adopt');
/**
 * The spend ceiling for ONE RUN.
 *
 * $0.05 and not the docs' $0.25, because this corpus is two orders of magnitude
 * smaller: a hundred-odd short strings against a thousand-odd documentation
 * sentences. Rebuilding all of it from nothing is cents. A run that wants more
 * than this is a re-segmentation or a new language, which is the moment to look
 * before paying.
 */
const BUDGET = Number(flag('budget') ?? process.env.OPENPLATE_TRANSLATE_UI_BUDGET ?? '0.05');
/** The exit code for "the run was refused on cost", distinct from "the run broke". */
const OVER_BUDGET = 2;
/** The same one-writer rule `translate-docs` states and for the same reason: translation is not deterministic. */
const WRITABLE = process.env.CI !== undefined || process.env.GITHUB_ACTIONS !== undefined || args.includes('--local');
const OUT = resolve(ROOT, 'src/generated/ui-i18n');
const FILE = resolve(OUT, `${LOCALE}.json`);

/**
 * What the docs corpus never has to say, because a parsed document reaches the
 * model as text and numbered markers only.
 *
 * A catalog leaf still carries its interpolation. `{{price}}` is a value
 * i18next substitutes by NAME, so a translated name is a permanent literal
 * `{{prix}}` on the page, and `<selfHosting>` is an element `<Trans>` maps to a
 * component, so a dropped closing tag takes a link's words with it. Both are
 * refused on the way in by `usable`; this is the same rule said before the
 * answer rather than after it.
 */
const NOTES = [
  'A {{name}} placeholder is a value the application substitutes at render time. Keep the name',
  'exactly as written, in English, inside the double braces. Never translate the name.',
  'An <example> ... </example> tag pair wraps words that become a link or a bold phrase. Keep both',
  'halves, keep the tag name in English, and keep some words between them.',
  'You may move a placeholder or a tag pair to wherever the target grammar puts it.',
];

if (LOCALE === SOURCE_LANGUAGE) {
  console.error(`translate-ui: ${LOCALE} is the source language. It is what the other bundles are made from.`);
  process.exit(1);
}
if (!SUPPORTED_LANGUAGES.some((language) => language === LOCALE)) {
  console.error(`translate-ui: ${LOCALE} is not one of the site's languages (${SUPPORTED_LANGUAGES.join(', ')}).`);
  process.exit(1);
}

const NAMESPACES = namespacesOf(ROOT, SOURCE_LANGUAGE);
const ENGLISH = new Map<string, CatalogTree>(
  NAMESPACES.map((namespace) => [namespace, readCatalog(catalogPath(ROOT, SOURCE_LANGUAGE, namespace))]),
);
const TARGET = new Map<string, CatalogTree>(
  NAMESPACES.map((namespace) => [namespace, readCatalog(catalogPath(ROOT, LOCALE, namespace))]),
);

/**
 * Namespaces split by the register they buy their strings in, via
 * `bundleForNamespace`. Two groups only, ever: `legal`, formal, and
 * everything else, informal. This site's own namespaces (`common`, `docs`)
 * both fall into the informal group today; `LEGAL_NAMESPACES` stays empty
 * here and is never sent, and it costs nothing to keep the branch alive for
 * the app repo's copy, which does carry a `legal.json`.
 */
const LEGAL_NAMESPACES = NAMESPACES.filter((namespace) => bundleForNamespace(namespace) === 'legal');
const COMMON_NAMESPACES = NAMESPACES.filter((namespace) => bundleForNamespace(namespace) !== 'legal');

/** The catalogs for a list of namespace names, skipping any that was never read. */
function catalogsFor(namespaces: string[], source: Map<string, CatalogTree>): CatalogTree[] {
  return namespaces.map((namespace) => source.get(namespace)).filter((tree): tree is CatalogTree => tree !== undefined);
}

const units = collectLeaves([...ENGLISH.values()]);
const skipped = [...ENGLISH.values()]
  .flatMap((tree) => leaves(tree))
  .filter((leaf) => skipReason(leaf.value) !== null);

const memory: Memory = loadMemory(FILE);
// A dry run writes nothing, and `--adopt` writes the memory, so the two cannot
// both be honoured. The dry run wins: it is the one an operator reaches for
// before they are sure.
if (ADOPT && DRY) console.log('translate-ui: --adopt does nothing under --dry. Re-run without it to record them.');
if (ADOPT && !DRY) adopt();
const done = lookup(memory, LOCALE);
const misses = [...units.values()].filter((unit) => !done.has(unit.hash));
const words = misses.reduce((sum, unit) => sum + unit.source.split(/\s+/).length, 0);

console.log(
  `translate-ui: ${LOCALE}, ${NAMESPACES.length} namespaces, ${units.size} strings to translate, ` +
    `${skipped.length} skipped as a name, a number or a placeholder, ${done.size} in memory, ` +
    `${misses.length} misses (~${words} words).`,
);

/**
 * The misses, chunked back into the bundle they came from rather than as one
 * flattened set. Mixing a `legal` string into a `common` chunk would ask for
 * its formal sentence under an informal system prompt, so each request may
 * carry strings from ONE bundle only.
 */
const commonMisses = [...collectLeaves(catalogsFor(COMMON_NAMESPACES, ENGLISH)).values()].filter(
  (unit) => !done.has(unit.hash),
);
const legalMisses = [...collectLeaves(catalogsFor(LEGAL_NAMESPACES, ENGLISH)).values()].filter(
  (unit) => !done.has(unit.hash),
);
const commonBatches = chunk(commonMisses, CHUNK);
const legalBatches = chunk(legalMisses, CHUNK);

const quote = await price([...commonBatches.flat(), ...legalBatches.flat()]);
if (quote === null) {
  console.error(`translate-ui: could not read ${MODEL}'s rate. An unpriced run is an unbounded one.`);
  process.exit(1);
}
if (quote.requests > 0) {
  console.log(
    `translate-ui: ${quote.requests} requests, ~${quote.promptTokens} prompt tokens, ` +
      `~${quote.completionTokens} completion tokens, estimated ${quote.cost.toFixed(4)} USD.`,
  );
} else {
  console.log('translate-ui: nothing to translate, 0.0000 USD.');
}

if (DRY) {
  for (const unit of misses.slice(0, 20)) console.log(`  miss  ${unit.key}  ${unit.source.slice(0, 80)}`);
  if (misses.length > 20) console.log(`  ... and ${misses.length - 20} more`);
  console.log('translate-ui: dry run, nothing was sent and nothing was written.');
  process.exit(0);
}

const total: Usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
let refused = false;

const totalBatches = commonBatches.length + legalBatches.length;
if (totalBatches > 0) {
  // CHECKED BEFORE THE FIRST REQUEST, not at the write. Reaching a refusal at
  // the write means the run already paid for every string and is about to throw
  // it away.
  if (!WRITABLE) {
    console.error('translate-ui: there is work to buy, but the memory is not writable here.');
    console.error('  The memory has one writer, and it is CI. Pass --local to override.');
    process.exit(1);
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (key === undefined || key === '') {
    console.error('translate-ui: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }
  if (quote.cost > BUDGET) {
    console.error(
      `translate-ui: ${quote.cost.toFixed(4)} USD is over the ${BUDGET.toFixed(2)} USD budget. Nothing was sent.`,
    );
    console.error(`  Re-run with --budget ${(Math.ceil(quote.cost * 100) / 100).toFixed(2)} to approve it.`);
    process.exit(OVER_BUDGET);
  }

  mkdirSync(OUT, { recursive: true });
  let at = 0;
  // ONE LOOP OVER THE GROUPS, `common` then `legal`: a group with no batches
  // (this site's `legal` group, always) contributes nothing to it, so `buy`
  // is called once per (bundle, batch) pair that actually has misses.
  const groups: { bundle: string; batches: UnitOfLeaf[][] }[] = [
    { bundle: 'common', batches: commonBatches },
    { bundle: 'legal', batches: legalBatches },
  ];
  outer: for (const group of groups) {
    for (const batch of group.batches) {
      at += 1;
      process.stdout.write(`  ${LOCALE} ${group.bundle} ${at}/${totalBatches} (${batch.length} strings) ... `);
      const before = total.cost;
      await buy(batch, group.bundle, key, LOCALE, done, total, NOTES);
      console.log(`${(total.cost - before).toFixed(6)} USD  (running ${total.cost.toFixed(4)} USD)`);
      // WRITTEN AFTER EVERY CHUNK. A stall or a Ctrl-C must not throw away the
      // strings already bought.
      save();
      // THE SECOND CEILING, against money actually spent rather than money
      // predicted.
      if (total.cost > BUDGET) {
        console.error(
          `translate-ui: spent ${total.cost.toFixed(4)} USD against a ${BUDGET.toFixed(2)} USD budget. ` +
            `Stopping. What was bought is saved.`,
        );
        refused = true;
        break outer;
      }
    }
  }
  console.log(
    `translate-ui: ${total.prompt_tokens} prompt tokens, ${total.completion_tokens} completion tokens, ` +
      `${total.cost.toFixed(4)} USD total.`,
  );
}

save();
write();

/**
 * ── THE DASH PASS, OVER THE WHOLE MEMORY AND NOT ONLY OVER WHAT WAS BOUGHT ──
 * `buy` already refuses an answer carrying an em dash or an en dash, so a
 * fresh run cannot store one. This covers the rest: a hand-written bundle
 * adopted with one in it, a hand edit, a model swap. It names the hash,
 * because the hash is what you delete from the file to buy the string again.
 */
const offenders = dashOffenders(memory, LOCALE);
if (offenders.length > 0) {
  console.error(`translate-ui: ${offenders.length} translations carry a banned dash. Delete these hashes and re-run:`);
  for (const key of offenders) console.error(`  ${key}  ${memory[key]?.[LOCALE]?.slice(0, 90) ?? ''}`);
  process.exit(1);
}

const covered = [...units.keys()].filter((key) => done.has(key)).length;
console.log(
  `translate-ui: ${LOCALE}, ${covered}/${units.size} strings translated` +
    `${units.size - covered > 0 ? `, ${units.size - covered} still English` : ''}.`,
);

if (refused) process.exit(OVER_BUDGET);

/**
 * The bundle as it stands today, recorded as the answer to today's English.
 *
 * Stamped `hand-written` rather than with a model name, because that is what it
 * is: provenance, and the thing to look at the day somebody asks which strings a
 * person wrote. Only keys the memory has no entry for are adopted, so running it
 * twice does nothing, and a key the memory already answers keeps the answer it
 * already has.
 *
 * ── A SPLIT IS REPORTED, NOT RESOLVED QUIETLY ──
 * The memory is keyed by a hash of the ENGLISH, so two catalog keys holding the
 * same English sentence are one entry and get one translation. A hand-written
 * bundle can disagree with itself there, and this site's did: "The inference
 * runtime" is "Die Inferenz-Laufzeit" in `common` and "Die Inference-Runtime" in
 * `docs`. Unifying them is the right end state, and it is the same argument the
 * glossary in `lib/translate.ts` makes about "ciphertext", but WHICH of the two
 * wins must not be decided by the order a directory happened to list. So the
 * first one seen is taken and both are printed with the keys that hold them, and
 * a person edits the memory if the other one was the good one.
 */
function adopt(): void {
  const today = new Date().toISOString().slice(0, 10);
  const from = new Map<string, string>();
  const split: string[] = [];
  let taken = 0;
  for (const namespace of NAMESPACES) {
    const english = ENGLISH.get(namespace);
    const target = TARGET.get(namespace);
    if (english === undefined || target === undefined) continue;
    const held = new Map(leaves(target).map((leaf) => [leaf.key, leaf.value]));
    for (const leaf of leaves(english)) {
      if (skipReason(leaf.value) !== null) continue;
      const value = held.get(leaf.key);
      if (value === undefined || value === '') continue;
      const key = hash(leaf.value);
      const already = memory[key]?.[LOCALE];
      if (already !== undefined) {
        if (already !== value) split.push(`  ${key}  ${from.get(key) ?? '?'} says "${already}", ${namespace}:${leaf.key} says "${value}"`);
        continue;
      }
      memory[key] = { en: leaf.value, model: 'hand-written', at: today, [LOCALE]: value };
      from.set(key, `${namespace}:${leaf.key}`);
      taken += 1;
    }
  }
  console.log(`translate-ui: adopted ${taken} hand-written strings into the ${LOCALE} memory.`);
  if (split.length > 0) {
    console.warn(
      `translate-ui: ${split.length} English strings are written twice and answered differently. ` +
        `The first is kept and every key holding that English now reads it. Edit the memory if the other was better:`,
    );
    for (const line of split) console.warn(line);
  }
  mkdirSync(OUT, { recursive: true });
  if (saveMemory(FILE, memory, WRITABLE) !== 'refused') return;
  console.error('translate-ui: refusing to write the memory outside CI. Pass --local to override.');
  process.exit(1);
}

/** The memory as it stands: what was on disk, plus what this run bought. */
function save(): void {
  const today = new Date().toISOString().slice(0, 10);
  for (const unit of units.values()) {
    const target = done.get(unit.hash);
    if (target === undefined || memory[unit.hash] !== undefined) continue;
    memory[unit.hash] = memo(unit.source, target, LOCALE, today);
  }
  mkdirSync(OUT, { recursive: true });
  if (saveMemory(FILE, memory, WRITABLE) !== 'refused') return;
  console.error('translate-ui: refusing to write the memory outside CI. Pass --local to override.');
  process.exit(1);
}

/**
 * The target bundles, rebuilt from the English tree and the memory.
 *
 * Runs even when nothing was bought, and that is deliberate: it is what carries
 * a key ADDED to the English bundle into the other two, so the parity test has
 * something to check rather than a missing key nobody notices until a page
 * prints `pages.home.hero.body` at a reader.
 */
function write(): void {
  for (const namespace of NAMESPACES) {
    const english = ENGLISH.get(namespace);
    const target = TARGET.get(namespace);
    if (english === undefined || target === undefined) continue;
    const file = catalogPath(ROOT, LOCALE, namespace);
    const state = saveCatalog(file, withTranslations(english, done, target), WRITABLE);
    console.log(`translate-ui: ${LOCALE}/${namespace}.json ${state}.`);
    if (state !== 'refused') continue;
    console.error('translate-ui: refusing to write the catalogs outside CI. Pass --local to override.');
    process.exit(1);
  }
}
