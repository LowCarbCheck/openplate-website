/**
 * translate-docs — machine-translate openplate's synced documentation into one
 * language.
 *
 * A DEVELOPER TOOL whose output is COMMITTED, the same bargain as
 * `sync-docs.ts`. The build stage has no network, and a translation vendor
 * outage must never fail a deploy.
 *
 *   pnpm translate:docs --dry-run              # count and price the misses, spend nothing
 *   pnpm translate:docs                        # buy them. CI only, see WRITABLE
 *   pnpm translate:docs --local                # ... or override that, deliberately
 *   pnpm translate:docs --budget 0.50          # approve a spend over the default ceiling
 *   pnpm translate:docs --preview sync/protocol
 *
 * ── EXIT CODES, BECAUSE THE WORKFLOW READS THEM ──
 *   0  done, or nothing to do
 *   1  broken: no key, no rate, a memory it may not write, a banned dash in the memory
 *   2  refused on cost. Nothing was sent, or what was sent is saved and the rest is not coming.
 *
 * Two is not a failure of the docs. The English is correct and current and
 * should still ship; only the translation waits for someone to approve the
 * number.
 *
 * ── DRIFT IS IMPOSSIBLE, BY CONSTRUCTION ──
 * Nothing here is a second copy of the docs. The memory in
 * `src/generated/docs-i18n/de.json` is keyed by a hash of the ENGLISH template,
 * and the German page is rebuilt from the English tree plus that memory at
 * render time. Edit a sentence upstream and its key stops matching, so that one
 * sentence is retranslated and every other stays put. A sentence with no
 * translation renders its English, never a blank.
 *
 * ── ONE LANGUAGE, WHERE COLLIE HAS SIX ──
 * collie's script takes every locale at once, because a per-locale ceiling is
 * not a ceiling: five invocations of "at most $0.25" is a run that may spend
 * $1.25. This site publishes one language besides English, so `--locale` takes
 * one and the budget is the run's. When a second language arrives, that is the
 * reason to take collie's loop back rather than to invoke this twice.
 *
 * PORTED FROM collie-website's `scripts/translate-docs.ts`, bun to node. The
 * paid half is in `scripts/lib/translate.ts`; the reason for the cut is written
 * at the top of that file.
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { type Memory, hash, rebuildBlock } from '../app/lib/docs-i18n.server';
import { SUPPORTED_LANGUAGES } from '../app/i18n/language';
import { spansText, type Block } from '../app/lib/docs';
import {
  CHUNK,
  MODEL,
  type Usage,
  chunk,
  collectUnits,
  dashOffenders,
  fill,
  loadMemory,
  lookup,
  markerInSource,
  memo,
  missesOf,
  pagesOf,
  price,
  saveMemory,
} from './lib/translate';
import { DOCS_INDEX } from '../src/generated/docs-index';
import { DOCS } from '../src/generated/docs-registry';

const args = process.argv.slice(2);
function flag(name: string): string | undefined {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
}

const LOCALE = flag('locale') ?? 'de';
const DRY = args.includes('--dry-run');
/**
 * The spend ceiling for ONE RUN.
 *
 * $0.25 sits far above the steady state and just below a full rebuild. An
 * ordinary release moves a few dozen sentences and costs cents. Rebuilding the
 * whole corpus from nothing costs a few tenths of a dollar, and that only
 * happens when something structural changed: a new language, a new model, a new
 * way of cutting sentences. Those are the moments to look before paying, which
 * is what this is for.
 */
const BUDGET = Number(flag('budget') ?? process.env.OPENPLATE_TRANSLATE_BUDGET ?? '0.25');
/** The exit code for "the run was refused on cost", distinct from "the run broke". */
const OVER_BUDGET = 2;
/**
 * Writing the memory is CI's job, not a laptop's.
 *
 * Translation is not deterministic: two runs over the same miss return two
 * different German sentences, both correct. If a local session translates and
 * commits, the next scheduled run has a conflict on content nobody can
 * adjudicate — the diff is two good translations of one sentence. So the memory
 * has one writer. `--dry-run` stays open to everyone, always, because it writes
 * nothing.
 */
const WRITABLE = process.env.CI !== undefined || process.env.GITHUB_ACTIONS !== undefined || args.includes('--local');
/** Stop after N chunks. For a first look without paying for all of it. */
const LIMIT = Number(flag('limit') ?? Infinity);
const PREVIEW = flag('preview');
const OUT = resolve('src/generated/docs-i18n');
const FILE = resolve(OUT, `${LOCALE}.json`);

if (!SUPPORTED_LANGUAGES.some((language) => language === LOCALE)) {
  console.error(`translate-docs: ${LOCALE} is not one of the site's languages (${SUPPORTED_LANGUAGES.join(', ')}).`);
  process.exit(1);
}

const units = collectUnits(DOCS_INDEX, DOCS);
// A source sentence that already contains `{{` would come back indistinguishable
// from a marker and lose whatever it stood for. It has never happened; it exits
// rather than corrupts if it does.
const collision = markerInSource(units);
if (collision !== undefined) {
  console.error(`translate-docs: source text contains the marker sequence: ${collision.source.slice(0, 90)}`);
  process.exit(1);
}

const memory: Memory = loadMemory(FILE);
const done = lookup(memory, LOCALE);
const misses = missesOf(units, done);
const words = misses.reduce((sum, unit) => sum + unit.source.split(/\s+/).length, 0);

console.log(
  `translate-docs: ${LOCALE} — ${units.size} sentences, ${done.size} in memory, ` +
    `${misses.length} to translate (~${words} words).`,
);

/**
 * A miss rate this high is not an edit to openplate's docs. It is a change to
 * how they are CUT.
 *
 * Edit a release's worth of documentation and a few dozen sentences move. Change
 * the segmentation, the hash, the marker syntax or the template shape, and every
 * key is new at once. Both look identical from inside — a large number of misses
 * and a large bill — and only one of them is worth paying. The budget stops the
 * spend either way; this names which one it was, so the operator reading a red
 * run is not left to infer it from a dollar figure.
 */
if (done.size > 0 && misses.length * 2 > units.size) {
  console.warn(
    `translate-docs: ${misses.length} of ${units.size} sentences are new. That is a re-segmentation, ` +
      `not a docs change. Check the hash before approving the spend.`,
  );
}

const batches = chunk(misses, CHUNK).slice(0, LIMIT);
const quote = await price(batches.flat());
if (quote === null) {
  console.error(`translate-docs: could not read ${MODEL}'s rate. An unpriced run is an unbounded one.`);
  process.exit(1);
}
if (quote.requests > 0) {
  console.log(
    `translate-docs: ${quote.requests} requests, ~${quote.promptTokens} prompt tokens, ` +
      `~${quote.completionTokens} completion tokens, estimated ${quote.cost.toFixed(4)} USD.`,
  );
} else {
  console.log('translate-docs: nothing to translate, 0.0000 USD.');
}

if (DRY) {
  console.log('translate-docs: dry run, nothing was sent and nothing was written.');
  process.exit(0);
}

const total: Usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
let refused = false;

if (batches.length > 0) {
  // CHECKED BEFORE THE FIRST REQUEST, not at the write. Reaching a refusal at
  // the write means the run already paid for every sentence and is about to
  // throw it away. Pay and discard is the one outcome worse than not running.
  if (!WRITABLE) {
    console.error('translate-docs: there is work to buy, but the memory is not writable here.');
    console.error('  The memory has one writer, and it is CI. Pass --local to override.');
    process.exit(1);
  }
  const key = process.env.OPENROUTER_API_KEY;
  if (key === undefined || key === '') {
    console.error('translate-docs: OPENROUTER_API_KEY is not set.');
    process.exit(1);
  }
  if (quote.cost > BUDGET) {
    console.error(
      `translate-docs: ${quote.cost.toFixed(4)} USD is over the ${BUDGET.toFixed(2)} USD budget. Nothing was sent.`,
    );
    console.error(`  Re-run with --budget ${(Math.ceil(quote.cost * 100) / 100).toFixed(2)} to approve it.`);
    process.exit(OVER_BUDGET);
  }

  mkdirSync(OUT, { recursive: true });
  let at = 0;
  for (const batch of batches) {
    at += 1;
    process.stdout.write(`  ${LOCALE} ${at}/${batches.length} (${batch.length} sentences) ... `);
    const before = total.cost;
    await fill(batch, LOCALE, key, done, total);
    console.log(`${(total.cost - before).toFixed(6)} USD  (running ${total.cost.toFixed(4)} USD)`);
    // WRITTEN AFTER EVERY CHUNK, not once at the end. This is a paid run of
    // twenty-odd requests over several minutes. A stall, a cancelled job or a
    // Ctrl-C must not throw away the sentences already bought: the next run
    // reads them back and asks only for what is still missing.
    save();
    // THE SECOND CEILING, against money actually spent rather than money
    // predicted. The estimate is a guess, and a retry storm or a model that
    // suddenly answers at length would spend past it.
    if (total.cost > BUDGET) {
      console.error(
        `translate-docs: spent ${total.cost.toFixed(4)} USD against a ${BUDGET.toFixed(2)} USD budget. ` +
          `Stopping. What was bought is saved.`,
      );
      refused = true;
      break;
    }
  }
  console.log(
    `translate-docs: ${total.prompt_tokens} prompt tokens, ${total.completion_tokens} completion tokens, ` +
      `${total.cost.toFixed(4)} USD total.`,
  );
}

save();

/**
 * ── THE DASH PASS, OVER THE WHOLE MEMORY AND NOT ONLY OVER WHAT WAS BOUGHT ──
 * `fill` already refuses an answer carrying an em dash or an en dash, so a fresh
 * run cannot store one. This pass covers the rest: a memory written before that
 * check existed, a hand edit, a model swap. It names the hash rather than the
 * sentence, because the hash is what you delete from the file to buy the
 * sentence again.
 */
const offenders = dashOffenders(memory, LOCALE);
if (offenders.length > 0) {
  console.error(
    `translate-docs: ${offenders.length} translations carry a banned dash. Delete these hashes and re-run:`,
  );
  for (const key of offenders) console.error(`  ${key}  ${memory[key]?.[LOCALE]?.slice(0, 90) ?? ''}`);
  process.exit(1);
}

const covered = [...units.keys()].filter((key) => done.has(key)).length;
console.log(
  `translate-docs: ${LOCALE} — ${covered}/${units.size} sentences translated` +
    `${units.size - covered > 0 ? `, ${units.size - covered} still English` : ''}.`,
);

if (refused) process.exit(OVER_BUDGET);

if (PREVIEW !== undefined) preview(PREVIEW);

/** The memory as it stands: what was on disk, plus what this run bought. */
function save(): void {
  const today = new Date().toISOString().slice(0, 10);
  for (const unit of units.values()) {
    const target = done.get(unit.hash);
    if (target === undefined || memory[unit.hash] !== undefined) continue;
    memory[unit.hash] = memo(unit.source, target, LOCALE, today);
  }
  if (saveMemory(FILE, memory, WRITABLE) !== 'refused') return;
  console.error('translate-docs: refusing to write the memory outside CI. Pass --local to override.');
  process.exit(1);
}

/** A page, English above German, for a human to judge before a workflow ships it. */
function preview(name: string): void {
  const page = pagesOf(DOCS_INDEX, DOCS).find((candidate) => `${candidate.component}/${candidate.slug}` === name);
  if (page === undefined) {
    console.error(`translate-docs: no doc named ${name}. Use <component>/<slug>.`);
    process.exit(1);
  }
  console.log(`\n── ${page.title} → ${done.get(hash(page.title)) ?? page.title} ──\n`);
  for (const block of page.blocks.slice(0, 14)) {
    if (block.kind === 'code') {
      console.log(`[code ${block.lang}] ${block.text.split('\n')[0] ?? ''} …\n`);
      continue;
    }
    const before = render(block);
    if (before.trim() === '') continue;
    console.log(`EN  ${before}\n${LOCALE.toUpperCase()}  ${render(rebuildBlock(block, done))}\n`);
  }
}

function render(block: Block): string {
  switch (block.kind) {
    case 'code':
      return '';
    case 'heading':
      return `${'#'.repeat(block.level)} ${spansText(block.spans)}`;
    case 'paragraph':
    case 'quote':
      return spansText(block.spans);
    case 'list':
      return block.items.map((item) => `- ${spansText(item)}`).join('\n    ');
    case 'table':
      return block.head.map((cell) => spansText(cell)).join(' | ');
    case 'image':
      return block.alt;
  }
}
