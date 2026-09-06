/**
 * The German documentation, rebuilt from the translation memory at render time.
 *
 * PORTED FROM collie-website's `scripts/translate-docs.ts`, which holds the
 * same template, hash and rebuild functions inside the script that buys the
 * translations. They live here instead because of the one thing this site does
 * differently: collie EMITS a second set of generated modules per locale, and
 * this site rebuilds the German page from the English tree and the memory in
 * the route loader. So both sides — the script that fills the memory and the
 * loader that reads it — need the same three functions, and a second copy of
 * the hash would be a silent way to buy every sentence twice.
 *
 * ── IT NEVER SEES STRUCTURE ──
 * `sync-docs.ts` has already parsed the docs into the block tree in
 * `app/lib/docs.ts`. A code block, an inline `code` span, a link's `href` and a
 * heading's `id` are each their own field, so the translator is handed TEXT AND
 * NOTHING ELSE. There is no fence to preserve and no markup to re-balance. The
 * classic failure of translating markdown, a model that helpfully localises a
 * shell command, is not possible here, because the model is never shown one.
 *
 * ── THE UNIT IS AN INLINE RUN, NOT A STRING ──
 * "Read `openplate doctor` first" is three spans. Translated one at a time it
 * becomes three fragments in English word order. So each run is flattened to a
 * TEMPLATE, `Read {{0}} first`, translated whole, and rebuilt from the marker
 * positions in the ANSWER. The model is free to move `{{0}}`, which is the
 * entire point. Nested runs — a link's own text, a bold phrase — are translated
 * as their own templates, one level down.
 *
 * ── `.server`, AND NOT BY HABIT ──
 * `hash` is `node:crypto`, and the memory is the whole German corpus. Both
 * belong to the build: the doc routes call this from a loader, React Router
 * strips a loader from the browser bundle, and the suffix is what makes an
 * accidental import from a component fail at the build rather than ship a
 * hashing library and every German sentence to a reader who wanted one page.
 */
import { createHash } from 'node:crypto';

import { SOURCE_LANGUAGE, type LanguageCode } from '#app/i18n/language';
import {
  type Block,
  type ComponentDocs,
  type DocEntry,
  type DocFile,
  type Inline,
  diagramLabels,
  spansText,
  withDiagramLabels,
} from '#app/lib/docs';
import DE_MEMORY from '../../src/generated/docs-i18n/de.json';

/**
 * A `{{n}}` marker stands for a child span the model must not read and must not
 * lose. It may MOVE the marker, and in German it often must. It may not drop
 * one, duplicate one or invent one, and `rebuild` refuses the answer if it does.
 */
export const MARKER = /\{\{(\d+)\}\}/g;

/** Everything in an inline run that is NOT plain text, and so becomes a marker. */
export type Child = Exclude<Inline, { kind: 'text' }>;

/** One inline run, flattened: the words, and the children its `{{n}}` markers stand for. */
export interface Template {
  text: string;
  children: Child[];
}

/** One segment of English, and the key it is remembered under. */
export interface Unit {
  hash: string;
  source: string;
}

/**
 * One remembered sentence, as it is written to
 * `src/generated/docs-i18n/<locale>.json`.
 *
 * The target is keyed BY LOCALE CODE rather than by a field called `target`, so
 * a reader opening the memory sees `"de": "..."` next to the English it stands
 * for. Every value is a string, which is why one index signature covers the
 * three fixed fields and the locale alike.
 */
export interface Memo {
  /** The English template this entry translates, markers and all. */
  en: string;
  /** The model that produced it — provenance, and the thing to check after a model change. */
  model: string;
  /** The day it was bought. Absolute, because a relative date in a committed file rots. */
  at: string;
  [locale: string]: string | undefined;
}

export type Memory = Record<string, Memo>;

export function hash(source: string): string {
  return createHash('sha256').update(source).digest('hex').slice(0, 16);
}

/** One inline run, flattened to a template and the children its markers stand for. */
export function template(spans: Inline[]): Template {
  const children: Child[] = [];
  let text = '';
  for (const span of spans) {
    if (span.kind === 'text') {
      text += span.text;
      continue;
    }
    text += `{{${children.length}}}`;
    children.push(span);
  }
  return { text, children };
}

/**
 * Is this template worth a request?
 *
 * A run with no words of its own — a paragraph that is one link, a table cell
 * that is one `code` span — has nothing to translate, and sending it buys a
 * marker back for money.
 */
export function translatable(source: string): boolean {
  return source.replaceAll(MARKER, '').trim() !== '';
}

/**
 * Does a translation carry exactly the markers its source did?
 *
 * A SET COMPARISON, NOT A SEQUENCE. Moving `{{0}}` past `{{1}}` is what the
 * marker is for; German puts the link at the other end of the sentence often
 * enough. Losing one, inventing one or renumbering them is not.
 */
export function fits(source: string, target: string): boolean {
  const of = (text: string) =>
    [...text.matchAll(MARKER)]
      .map((match) => match[0])
      .toSorted((a, b) => (a < b ? -1 : 1))
      .join();
  return of(source) === of(target);
}

/** Split a template on its markers and interleave the children back in, in the template's order. */
export function withChildren(text: string, children: Child[]): Inline[] {
  const out: Inline[] = [];
  let at = 0;
  for (const match of text.matchAll(MARKER)) {
    const before = text.slice(at, match.index);
    if (before !== '') out.push({ kind: 'text', text: before });
    const child = children[Number(match[1])];
    if (child !== undefined) out.push(child);
    at = match.index + match[0].length;
  }
  const rest = text.slice(at);
  if (rest !== '') out.push({ kind: 'text', text: rest });
  return out;
}

/**
 * One marker's child, with its own inner run translated.
 *
 * Built field by field rather than spread, because a link carries an `href` the
 * translator never sees and must never acquire a translated one by accident.
 */
function rebuildChild(child: Child, memory: Map<string, string>): Child {
  if (child.kind === 'code') return child;
  const spans = rebuild(child.spans, memory);
  if (child.kind === 'link') return { kind: 'link', spans, href: child.href };
  return { kind: child.kind, spans };
}

/** Rebuild a run from a translated template. The markers may have moved; they may not have gone. */
export function rebuild(source: Inline[], memory: Map<string, string>): Inline[] {
  const { text, children } = template(source);
  const translated = memory.get(hash(text));
  const done: Child[] = children.map((child) => rebuildChild(child, memory));
  if (translated === undefined) return withChildren(text, done);

  // ── ENGLISH, NOT AN EXIT ──
  // `fill` rejects a marker mismatch before it can be stored, so nothing
  // reaching here should fail. If one does — a hand-edited memory, a format
  // change — the answer is the same as for any segment with no translation:
  // show the English. Killing the run instead would let one bad sentence stop
  // every page in both languages from being written, which is the failure this
  // pipeline exists to avoid.
  if (!fits(text, translated)) return withChildren(text, done);
  return withChildren(translated, done);
}

/** A plain string with no markers — a doc title, a nav label. Falls back to its English. */
export function one(text: string, memory: Map<string, string>): string {
  return memory.get(hash(text)) ?? text;
}

export function rebuildBlock(block: Block, memory: Map<string, string>): Block {
  switch (block.kind) {
    case 'code':
      return block;
    case 'heading': {
      // `id` STAYS ENGLISH. Every anchor in both languages then points at the
      // same place, and the hand-written cross-doc links in openplate's own docs
      // keep working from a German page.
      const spans = rebuild(block.spans, memory);
      return { ...block, spans, text: spansText(spans) };
    }
    case 'paragraph':
    case 'quote':
      return { ...block, spans: rebuild(block.spans, memory) };
    case 'list': {
      const rebuilt: Extract<Block, { kind: 'list' }> = {
        ...block,
        items: block.items.map((item) => rebuild(item, memory)),
      };
      if (block.nested !== undefined) {
        rebuilt.nested = block.nested.map((entry) => ({
          item: entry.item,
          blocks: entry.blocks.map((child) => rebuildBlock(child, memory)),
        }));
      }
      return rebuilt;
    }
    case 'table':
      return {
        ...block,
        head: block.head.map((cell) => rebuild(cell, memory)),
        rows: block.rows.map((row) => row.map((cell) => rebuild(cell, memory))),
      };
    // `src` STAYS ENGLISH, always — it is a path into `public/docs/images/`, not
    // a sentence, and a translated one would 404. Only `alt` is rebuilt, the
    // same way a doc title is.
    case 'image':
      return { ...block, alt: one(block.alt, memory) };
    // THE BLOCK IS UNCHANGED APART FROM ITS DESCRIPTION, and that is still true
    // now that the drawing itself is translated. `source` is the ENGLISH fence
    // and stays it: the page shows it behind a disclosure, and what a reader
    // copies out of there should be the thing the three repositories actually
    // wrote. `id` is that fence hashed, and it now names two committed SVG
    // files per language rather than two in all, which is a question for the
    // page and not for this tree, see `doc-blocks.tsx`. The German drawing is made once at
    // sync time by `translateDiagram` below, out of the same memory, so nothing
    // has to be decided again here at render time.
    case 'diagram':
      return { ...block, alt: rebuild(block.alt, memory) };
  }
}

// ── collection ───────────────────────────────────────────────────────────────

function add(source: string, out: Map<string, Unit>): void {
  if (!translatable(source)) return;
  const key = hash(source);
  out.set(key, { hash: key, source });
}

/** Every translatable template in a run: this level first, then each child's own run. */
export function collect(spans: Inline[], out: Map<string, Unit>): void {
  const { text, children } = template(spans);
  add(text, out);
  for (const child of children) {
    if (child.kind === 'code') continue;
    collect(child.spans, out);
  }
}

export function collectBlock(block: Block, out: Map<string, Unit>): void {
  switch (block.kind) {
    case 'code':
      return;
    case 'heading':
    case 'paragraph':
    case 'quote':
      collect(block.spans, out);
      return;
    case 'list':
      for (const item of block.items) collect(item, out);
      // The blocks under an item are blocks: a nested paragraph is a sentence
      // and is translated, a nested fence is a command and is not. Recursing is
      // what keeps that decision in one place rather than restating it here.
      for (const entry of block.nested ?? []) for (const child of entry.blocks) collectBlock(child, out);
      return;
    case 'table':
      for (const cell of block.head) collect(cell, out);
      for (const row of block.rows) for (const cell of row) collect(cell, out);
      return;
    // `alt` is a plain string, not a run — the same shape as a doc title — so it
    // goes through `add`, not `collect`. `src` never reaches the translator: it
    // is a path, not a sentence.
    case 'image':
      add(block.alt, out);
      return;
    // TWO THINGS, AND THE SECOND ONE IS THE PICTURE. `alt` is spans, so it goes
    // through `collect` like any paragraph. The LABELS are plain strings, the
    // shortest prose the site publishes, and they are bought here so that
    // `translateDiagram` below has something to put back into the fence. The
    // fence itself is still never sent anywhere: what leaves is the words
    // between the quotes and nothing else, which is the rule the diagram
    // pipeline was built on and this does not bend it.
    case 'diagram':
      collect(block.alt, out);
      for (const label of diagramLabels(block.source)) add(label, out);
      return;
  }
}

export function collectDoc(doc: DocFile, out: Map<string, Unit>): void {
  add(doc.title, out);
  for (const block of doc.blocks) collectBlock(block, out);
}

export function collectEntry(entry: DocEntry, out: Map<string, Unit>): void {
  add(entry.title, out);
  collect(entry.blurb, out);
}

// ── what a route loader calls ────────────────────────────────────────────────

/**
 * The memory for a language, as the flat map everything above reads.
 *
 * The SOURCE language has none by definition: it is what the memory is keyed
 * BY, and an empty map makes every `rebuild` return its English without a
 * branch at the call site. It is the source language and not the default one,
 * which are two different languages since German took the root: German is the
 * default and it is precisely the language that HAS a memory.
 */
export function translationsFor(language: LanguageCode): Map<string, string> {
  if (language === SOURCE_LANGUAGE) return new Map();
  // SAFETY: the file is written by `scripts/translate-docs.ts` alone and its
  // shape is asserted there on the way out. Nothing below trusts it beyond
  // "the values are strings": a missing locale field is a miss, and a miss
  // renders English.
  const memory = DE_MEMORY as Memory;
  const out = new Map<string, string>();
  for (const [key, entry] of Object.entries(memory)) {
    const target = entry[language];
    if (target !== undefined && target !== '') out.set(key, target);
  }
  return out;
}

/**
 * One page, in the reader's language.
 *
 * ── THE FALLBACK IS INSIDE, NOT AT THE CALL SITE ──
 * `rebuild` returns the English for any run it has no translation of, so a page
 * that is nine tenths translated comes back nine tenths translated, sentence by
 * sentence. A partial translation is not a special case for the route; it is
 * just a document. This is what "never blank" means in practice.
 */
export function translateDoc(doc: DocFile, memory: Map<string, string>): DocFile {
  if (memory.size === 0) return doc;
  return { ...doc, title: one(doc.title, memory), blocks: doc.blocks.map((block) => rebuildBlock(block, memory)) };
}

/**
 * One component's README table, in the reader's language: the sidebar, the docs
 * index and the previous/next links all read their titles from here.
 *
 * `source` is carried across untouched. It is provenance about openplate, not
 * about a language, and a translated sha would be a lie about where the words
 * came from.
 */
export function translateEntries(docs: ComponentDocs, memory: Map<string, string>): ComponentDocs {
  if (memory.size === 0) return docs;
  return {
    ...docs,
    entries: docs.entries.map((entry) => ({
      ...entry,
      title: one(entry.title, memory),
      blurb: rebuild(entry.blurb, memory),
    })),
  };
}

/**
 * One diagram's fence in the reader's language, or `null` when it must stay English.
 *
 * ── WHY THE FENCE IS TRANSLATED AT ALL, HAVING SAID IT NEVER WOULD BE ──
 * The rule this module opens with stands: a translator is handed text and never
 * structure, because a model shown a fence localises a node id or a shell
 * command. What was wrong was the conclusion drawn from it, that the labels
 * therefore stay English. A label is not code. It is the shortest prose on the
 * page, it sits inside a picture, and a picture is what a reader looks at
 * first, so an English drawing under a German paragraph is the most visible
 * untranslated thing the site can print. The labels come out of the fence, go
 * through the same memory under the same hash as every other sentence, and go
 * back between the same quotes. The translator still only ever sees words.
 *
 * ── THE FALLBACK IS PER DIAGRAM, NOT PER LABEL ──
 * `rebuild` falls back one sentence at a time, and that is right for prose: a
 * page nine tenths translated reads as a page. A drawing does not work that
 * way. Half of its boxes in German and half in English reads as a bug in the
 * software, where a wholly English drawing reads as a diagram nobody has got to
 * yet. So one missing label sends the whole fence back to English, which is
 * what returning `null` means here.
 *
 * ── AND IT IS ONLY EVER CALLED AT SYNC TIME ──
 * `sync-docs.ts` calls this once per diagram per language and draws the answer
 * into a committed SVG. No loader calls it, which is why an unusable
 * translation THROWS rather than being quietly dropped: the person who can fix
 * it is the one running the sync, and a label carrying a quote character would
 * otherwise end the mermaid string early and ship a broken picture.
 */
export function translateDiagram(source: string, memory: Map<string, string>): string | null {
  if (memory.size === 0) return null;

  const labels = new Map<string, string>();
  for (const label of diagramLabels(source)) {
    const target = memory.get(hash(label));
    if (target === undefined) return null;
    // A QUOTE OR A LINE BREAK IS NOT A TRANSLATION, it is the end of the label
    // and the start of whatever mermaid makes of the rest of the line. The
    // model has never returned one; if it ever does, the sync says so with the
    // label in its hands rather than drawing a diagram that lost half a row.
    if (/["\n]/.test(target)) {
      throw new Error(
        `docs-i18n: the translation of "${label}" carries a quote or a line break, which would end the label early: ${target}`,
      );
    }
    labels.set(label, target);
  }
  if (labels.size === 0) return null;

  return withDiagramLabels(source, labels);
}

/**
 * How much of one page the memory covers, from 0 to 1.
 *
 * The page says so when the answer is 0 — see `UntranslatedNotice`. A number
 * rather than a boolean because "translated" is not binary here: a doc synced
 * an hour ago has its new sentences in English on a German page, and the notice
 * that fits that page is not the notice that fits an untouched one.
 */
export function coverage(doc: DocFile, memory: Map<string, string>): number {
  const units = new Map<string, Unit>();
  collectDoc(doc, units);
  if (units.size === 0) return 1;
  let done = 0;
  for (const key of units.keys()) if (memory.has(key)) done += 1;
  return done / units.size;
}
