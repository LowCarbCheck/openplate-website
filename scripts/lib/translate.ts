/**
 * The paid half of `translate-docs`: what is missing, what it costs, and the
 * request that buys it.
 *
 * PORTED FROM collie-website's `scripts/translate-docs.ts`, which is one file.
 * It is two here for one reason: spec 03 asks for unit tests that assert an
 * unchanged sentence is not resent, and a single file whose body runs on import
 * cannot be imported by a test without spending money and calling
 * `process.exit`. So the CLI — arguments, gates, reporting — stays in
 * `translate-docs.ts`, and everything with a decision in it lives here where a
 * test can call it. No logic was rewritten to make the cut.
 */
import { readFileSync, writeFileSync } from 'node:fs';

import {
  type Memo,
  type Memory,
  type Unit,
  collect,
  collectBlock,
  collectDoc,
  collectEntry,
  fits,
  hash,
} from '../../app/lib/docs-i18n.server';
import {
  DOC_COMPONENTS,
  type ComponentDocs,
  type DocFile,
  type DocsIndex,
  type DocsRegistry,
} from '../../app/lib/docs';

/**
 * The one model this site's German comes from.
 *
 * Named here rather than passed in, and written into every entry of the memory,
 * because a model change is the one edit that invalidates translations without
 * changing a single English sentence. The memory says which model wrote each
 * line so that day is a query rather than an archaeology exercise.
 */
export const MODEL = 'google/gemini-3.8-flash';

/**
 * OpenRouter, unless a test points this somewhere else.
 *
 * The seam exists so the whole pipeline — chunking, the JSON contract, marker
 * validation, the dash check and the memory write — can be run offline against
 * a stub. Everything that can go wrong here goes wrong in code, not in the
 * model, and none of it should need a paid call to find.
 */
export const ENDPOINT = process.env.OPENROUTER_ENDPOINT ?? 'https://openrouter.ai/api/v1/chat/completions';

/** Segments per request. Small enough that one bad answer is cheap, large enough to amortise the style. */
export const CHUNK = 30;

/** Terms that stay in English in every language: product names, commands, and the tools we name. */
const KEEP = [
  'openplate',
  'openplate-sync',
  'openplate-inference',
  'Docker',
  'Postgres',
  'Tailscale',
  'GitHub',
  'systemd',
  'Linux',
  'macOS',
  'iOS',
  'Android',
  'PWA',
  'CLI',
  'API',
  'TLS',
  'llama.cpp',
  'OpenRouter',
];

/**
 * The register this site's German is written in, and the workspace's own style
 * contract underneath it.
 *
 * ── THE CONTRACT IS NOT COLLIE'S ──
 * collie asks every language for a formal register and tells German to use
 * "Sie". openplate's app addresses its reader as "du" in every string it ships,
 * so documentation that switches to "Sie" would be a different product talking.
 * The dash ban and the byte-identical rule are the workspace CLAUDE.md "Prose"
 * contract, said to the model rather than only checked after the fact — the
 * check still runs, in `dashOffenders`, because a rule stated is not a rule
 * kept.
 */
export function style(locale: string): string {
  return [
    "You translate the documentation of openplate, a food and health diary that keeps a person's",
    'data on their own devices. The reader is a developer or a self-hoster reading a technical guide.',
    '',
    'Register: plain, direct, a little dry. Concrete verbs. No marketing adjectives.',
    'Never an em dash or an en dash. Use a comma instead.',
    register(locale),
    '',
    `Leave these terms in English, exactly as written: ${KEEP.join(', ')}.`,
    'Every code span, link, number, file path, flag, environment variable, URL, port and product',
    'name is byte-identical to the English.',
  ].join('\n');
}

function register(locale: string): string {
  if (locale === 'de') {
    return [
      'German: address the reader as "du", which is what the openplate app itself does. Follow German',
      'software-documentation convention: a real German compound noun where one exists, rather than an',
      'English loan phrase. Never a literal calque of the English clause order.',
    ].join(' ');
  }
  return "Use the register that language's own technical documentation is written in.";
}

/**
 * Every segment of English this site publishes in more than one language.
 *
 * ── THE RELEASE NOTES ARE NOT IN HERE ──
 * The three CHANGELOGs are a third of the corpus and they are the part of it a
 * German reader gains least from: a changelog line names a flag, a route and a
 * version, and the sentence around it is four words long. They would roughly
 * double every run's bill for that. So `/releases/<component>` renders its
 * English and says so, and the guides — the pages someone reads to understand
 * or install openplate — are what the budget goes on.
 */
export function collectUnits(index: DocsIndex, docs: DocsRegistry): Map<string, Unit> {
  const units = new Map<string, Unit>();
  for (const component of DOC_COMPONENTS) {
    for (const entry of index[component].entries) collectEntry(entry, units);
    for (const doc of Object.values(docs[component])) collectDoc(doc, units);
  }
  return units;
}

/** Every page of every component, in the index's order. */
export function pagesOf(index: DocsIndex, docs: DocsRegistry): DocFile[] {
  const pages: DocFile[] = [];
  for (const component of DOC_COMPONENTS) {
    for (const entry of index[component].entries) {
      const page = docs[component][entry.slug];
      if (page !== undefined) pages.push(page);
    }
  }
  return pages;
}

/** Every component's table, for the preview and for the count. */
export function tablesOf(index: DocsIndex): ComponentDocs[] {
  return DOC_COMPONENTS.map((component) => index[component]);
}

/**
 * The segments this run has to buy: everything the memory does not already
 * answer.
 *
 * THE WHOLE ECONOMY OF THIS SCRIPT IS THIS ONE LINE. The memory is keyed by a
 * hash of the ENGLISH template, so editing one sentence upstream changes one
 * key, and the other nine hundred still resolve. A release that touches three
 * paragraphs costs three paragraphs.
 */
export function missesOf(units: Map<string, Unit>, memory: Map<string, string>): Unit[] {
  return [...units.values()].filter((unit) => !memory.has(unit.hash));
}

/** Chunk the misses so one bad answer costs one chunk, not the run. */
export function chunk(units: Unit[], size: number): Unit[][] {
  const out: Unit[][] = [];
  for (let at = 0; at < units.length; at += size) out.push(units.slice(at, at + size));
  return out;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
}

/** What a run is expected to cost, before it is allowed to start. */
export interface Quote {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;
}

/**
 * The answer: an object with a single list of strings in it.
 *
 * The FIELD NAME IS NOT PART OF THE CONTRACT, which is the whole reason this
 * type is an open dictionary rather than `{ xx: string[] }`. See the note in
 * `translate`.
 */
type Answer = Record<string, string[]>;

/**
 * A dash the workspace prose contract bans. Checked at the door, in `fill`, so
 * a sentence carrying one is a FAILED answer rather than a stored one: the
 * retry and the split then buy it again, and only a segment that will not come
 * back clean is left in English.
 */
const DASH = /[–—]/;

/** Every remembered sentence whose translation carries a banned dash, by hash. */
export function dashOffenders(memory: Memory, locale: string): string[] {
  const out: string[] = [];
  for (const [key, entry] of Object.entries(memory)) {
    const target = entry[locale];
    if (target !== undefined && DASH.test(target)) out.push(key);
  }
  return out;
}

/**
 * One request. Returns the strings, or `undefined` if the answer was not usable.
 *
 * DOES NOT EXIT on a bad answer, and that is the whole design of the retry
 * above it. Gemini returns a short array, or prose instead of JSON, on maybe one
 * call in thirty. That is not a bug to fix here, it is weather, and a 27-request
 * run that dies on the third one is unusable. The one thing it will not retry is
 * a rejected key, because that answer will not improve.
 *
 * Usage is added to `total` before any answer is judged. A wasted call still
 * costs money and must still show up in the number reported at the end.
 */
export async function translate(
  units: Unit[],
  locale: string,
  key: string,
  total: Usage,
): Promise<string[] | undefined> {
  const sources = units.map((unit) => unit.source);
  const body = {
    model: MODEL,
    // Minimal, because this is a translation and not a problem. Reasoning
    // tokens are billed at the completion rate and would eat the budget for
    // deliberation nobody reads.
    reasoning: { effort: 'minimal' },
    // Sized to the payload rather than picked once and left to truncate a big
    // chunk. German runs a little longer than the English it replaces and the
    // JSON envelope rides along, so four times the source length is the floor
    // that does not clip.
    max_tokens: Math.min(32_000, 1000 + sources.join('').length * 4),
    usage: { include: true },
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: style(locale) },
      {
        role: 'user',
        content: [
          `Translate each string in "en" into ${locale}.`,
          `Return JSON: {"xx": [...]} with EXACTLY ${sources.length} strings, in the same order.`,
          'A {{0}} marker is an untranslatable fragment. Keep every marker. Move it to wherever the',
          'target grammar puts it. Never translate, renumber, duplicate or drop one.',
          '',
          JSON.stringify({ en: sources }),
        ].join('\n'),
      },
    ],
  };

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    if (response.status === 401 || response.status === 403) {
      console.error(`\ntranslate-docs: OpenRouter rejected the key (${response.status}): ${detail}`);
      process.exit(1);
    }
    console.warn(`\n  ${response.status} from OpenRouter: ${detail.slice(0, 200)}`);
    return undefined;
  }
  // SAFETY: the shape OpenRouter documents, declared with every field optional.
  // Nothing below trusts it — the content is parsed and the array length is
  // checked before any of it is used.
  const json = (await response.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    usage?: Partial<Usage>;
  };
  total.prompt_tokens += json.usage?.prompt_tokens ?? 0;
  total.completion_tokens += json.usage?.completion_tokens ?? 0;
  total.cost += json.usage?.cost ?? 0;

  const content = json.choices?.[0]?.message?.content ?? '';
  let text: string[] | undefined;
  try {
    // ── THE ANSWER'S KEY IS NOT THE KEY WE ASKED FOR ──
    // The prompt asks for `{"xx": [...]}`. Gemini frequently answers
    // `{"de": [...]}` instead, having decided the target language is the more
    // natural name for the field. Reading `.xx` therefore threw away a perfectly
    // good translation and billed for it — collie found that the expensive way.
    //
    // So the key is not part of the contract. The array is. There is exactly one
    // array in the answer, and its length is checked below either way.
    // SAFETY: the shape claimed here is not trusted. `find(Array.isArray)`
    // rejects any field that is not a list, the length check below rejects a
    // list of the wrong size, and `map(String)` makes no assumption about the
    // elements. A parse that returns something else lands in the `catch`.
    const answer = JSON.parse(content.replace(/^```(?:json)?\n?|```$/g, '')) as Answer;
    text = Object.values(answer).find((value) => Array.isArray(value));
  } catch {
    console.warn(`\n  unparseable answer (${json.choices?.[0]?.finish_reason}): ${content.slice(0, 160)}`);
    return undefined;
  }
  if (!Array.isArray(text) || text.length !== sources.length) {
    const got = Array.isArray(text) ? `${text.length}` : 'none';
    console.warn(`\n  asked for ${sources.length} strings, got ${got} (${json.choices?.[0]?.finish_reason})`);
    return undefined;
  }
  return text.map(String);
}

/**
 * Fill the memory from one batch: two tries, then split, then give up on the
 * single segment.
 *
 * Splitting matters because the failures are not evenly spread. One awkward
 * segment can spoil the answer for the twenty-nine around it, and halving finds
 * it in a handful of calls instead of re-rolling the whole chunk. A segment that
 * survives to the bottom is left OUT of the memory, and `rebuild` then falls
 * back to its English. A page in mixed English is a smaller failure than a page
 * missing a sentence, and the next run picks the segment up again for free.
 */
export async function fill(
  batch: Unit[],
  locale: string,
  key: string,
  memory: Map<string, string>,
  total: Usage,
): Promise<void> {
  for (let tries = 0; tries < 2; tries += 1) {
    const text = await translate(batch, locale, key, total);
    if (text === undefined) continue;
    /**
     * ── MARKERS AND DASHES ARE CHECKED HERE, AT THE DOOR, NOT AT THE EMIT ──
     * collie checked markers only when the pages were written, and that was a
     * poison pill: a dropped `{{2}}` was stored, the run died rebuilding it, and
     * every future run died in the same place on the same cached sentence. Money
     * spent, no way forward but a hand edit.
     *
     * A bad answer is now simply a failed answer. It falls into the retry above,
     * then the split below, which isolates the one bad segment in a handful of
     * calls. The memory cannot hold a translation that does not fit the sentence
     * it belongs to, and it cannot hold a dash the house style bans.
     */
    const bad = batch.findIndex((unit, index) => !usable(unit.source, text[index] ?? ''));
    if (bad === -1) {
      batch.forEach((unit, index) => memory.set(unit.hash, text[index] ?? unit.source));
      return;
    }
    console.warn(`\n  rejected an answer: ${batch[bad]?.source.slice(0, 70)}`);
  }
  if (batch.length === 1) {
    console.warn(`  left in English: ${batch[0]?.source.slice(0, 90)}`);
    return;
  }
  const half = Math.ceil(batch.length / 2);
  console.warn(`  splitting ${batch.length} into ${half} + ${batch.length - half}`);
  await fill(batch.slice(0, half), locale, key, memory, total);
  await fill(batch.slice(half), locale, key, memory, total);
}

/**
 * An answer worth storing: the right markers, and no dash the house style bans.
 *
 * ── THE DASH RULE OUTRANKS THE SOURCE, AND HAS TO ──
 * A handful of English sentences carry an en dash of their own, "5–60 s". The
 * German is refused, retried and split, and the model usually rewrites the range
 * in words. Where it will not, the sentence is left in English, which is the
 * same outcome as any other segment the model cannot answer cleanly — and the
 * post-pass over the whole memory stays green, which is what makes it a check
 * rather than a warning nobody can act on.
 */
function usable(source: string, target: string): boolean {
  return target !== '' && fits(source, target) && !DASH.test(target);
}

/**
 * What the misses would cost, before anything is spent.
 *
 * An ESTIMATE and labelled as one. Token counts are derived from the payload
 * rather than measured. Prices are FETCHED, because a rate written down here
 * would be wrong within the quarter. `null` means the rate could not be read,
 * and the caller must then refuse to spend: an unpriced run is an unbounded one,
 * and this whole file exists so that no run is unbounded.
 *
 * An empty plan is priced at zero without a request. A quiet day must not touch
 * the network twice.
 */
export async function price(pending: Unit[]): Promise<Quote | null> {
  const requests = chunk(pending, CHUNK).length;
  if (requests === 0) return { requests: 0, promptTokens: 0, completionTokens: 0, cost: 0 };

  const payload = pending.reduce((sum, unit) => sum + unit.source.length, 0);
  // The system prompt and the instructions ride along on every chunk, which is
  // most of the overhead.
  const overhead = (style('de').length + 400) * requests;
  const promptTokens = Math.round((payload * 1.3 + overhead) / 4);
  // German is a Latin script that runs a little longer than its English, at
  // roughly four characters to the token. collie's figure is for Japanese and
  // does not carry.
  const completionTokens = Math.round(payload * 0.35);

  const response = await fetch('https://openrouter.ai/api/v1/models');
  if (!response.ok) return null;
  // SAFETY: OpenRouter's public model list. The `find` below returns undefined
  // if the shape is not this, and the caller refuses to spend rather than
  // guessing a rate.
  const models = (await response.json()) as { data: { id: string; pricing: { prompt: string; completion: string } }[] };
  const rate = models.data.find((model) => model.id === MODEL)?.pricing;
  if (rate === undefined) return null;
  return {
    requests,
    promptTokens,
    completionTokens,
    cost: promptTokens * Number(rate.prompt) + completionTokens * Number(rate.completion),
  };
}

// ── the memory on disk ───────────────────────────────────────────────────────

/** A file's contents, or `null` where there is no file. */
export function read(file: string): string | null {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function loadMemory(file: string): Memory {
  const text = read(file);
  if (text === null) return {};
  try {
    // SAFETY: this file is written by `save` below and by nothing else. A
    // hand-edited or truncated one throws in `JSON.parse` and lands in the empty
    // branch, which retranslates rather than corrupts.
    return JSON.parse(text) as Memory;
  } catch {
    return {};
  }
}

/** The memory as the flat lookup `rebuild` reads. */
export function lookup(memory: Memory, locale: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, entry] of Object.entries(memory)) {
    const target = entry[locale];
    if (target !== undefined && target !== '') out.set(key, target);
  }
  return out;
}

/**
 * The memory, sorted by hash and written only where it differs.
 *
 * ── SORTED BY HASH, WHICH IS AN ARBITRARY ORDER ON PURPOSE ──
 * The order has to be a function of the content and nothing else. Sorted by
 * source, an edit to one sentence moves every entry after it and the diff of a
 * three-sentence release is nine hundred lines. Sorted by hash, an edited
 * sentence lands where its new key falls and every other line is untouched, so
 * a reviewer sees what was bought.
 *
 * ── A SENTENCE THAT LEAVES THE DOCS IS NOT DELETED ──
 * A segment can leave without being gone: a file split, a revert or a rename
 * all look like a departure and all come back. Under a delete-on-sight rule that
 * day throws away the translations and buys them again, tripping the budget gate
 * on the way. So a hash stays until someone removes it by hand, and a sentence
 * that returns costs nothing.
 *
 * ── COMPARED BEFORE IT IS WRITTEN ──
 * A scheduled job that rewrites this file on a quiet day is a commit, a deploy,
 * and one more chance for the publish to stall for no reason at all.
 */
export function saveMemory(file: string, memory: Memory, writable: boolean): 'unchanged' | 'written' | 'refused' {
  const sorted: Memory = {};
  for (const key of Object.keys(memory).toSorted((a, b) => (a < b ? -1 : 1))) {
    const entry = memory[key];
    if (entry !== undefined) sorted[key] = entry;
  }
  const next = `${JSON.stringify(sorted, null, 2)}\n`;
  // COMPARED FIRST, and that order matters twice. A run with nothing to write
  // has no business being refused permission to write it.
  if (next === read(file)) return 'unchanged';
  if (!writable) return 'refused';
  writeFileSync(file, next, 'utf8');
  return 'written';
}

/** One bought sentence, as it goes into the memory. */
export function memo(source: string, target: string, locale: string, at: string): Memo {
  return { en: source, model: MODEL, at, [locale]: target };
}

/** The `{{` guard: source text that already looks like a marker would be lost in the round trip. */
export function markerInSource(units: Map<string, Unit>): Unit | undefined {
  return [...units.values()].find((unit) => unit.source.replaceAll(NUMBERED_MARKER, '').includes('{{'));
}

const NUMBERED_MARKER = /\{\{\d+\}\}/g;

export { hash, collect, collectBlock };
