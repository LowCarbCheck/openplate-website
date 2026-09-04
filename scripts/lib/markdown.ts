import type { Block, Inline } from '../../app/lib/docs';
import { slugify, spansText } from '../../app/lib/docs';

/**
 * A deliberately small markdown reader — only what these repositories' READMEs and docs actually use.
 *
 * Not a markdown library, and not trying to be. A dependency here would pull a full CommonMark
 * implementation plus an HTML sanitiser into a static site so that fifteen documentation files can be shown, and it would hand back HTML that this page would then have to inject. This
 * returns a typed tree instead: headings, paragraphs, lists, fenced code, block quotes and tables,
 * with bold / inline code / links inside them.
 *
 * What it deliberately DROPS, rather than mangling: raw HTML blocks (a README badge row, say) and nested lists. `parseBlocks` reports what it dropped so the sync script can
 * print it — silence there would be the failure mode, because a section that quietly loses its one
 * diagram still looks fine in review.
 *
 * A fenced block indented under a list item is the other shape it does NOT flatten: it stays inside
 * that item, as a nested block, because a command written under a step is that step's command. See
 * the `list` case below and the `nested` field in `app/lib/docs.ts`.
 *
 * A standalone `![alt](src)` line is the one exception: it is not raw HTML, these docs use it
 * for real screenshots, and dropping it silently is exactly the failure mode the paragraph above
 * warns about. It becomes its own `image` block, not an inline span — every occurrence in these
 * docs sits alone on its own line, and an image mid-paragraph is not a shape this reader needs yet.
 */

/** Where a link inside a copied doc file has to point once it is off GitHub. */
export interface LinkBase {
  /** e.g. `https://github.com/LowCarbCheck/openplate` */
  repo: string;
  /** Commit the docs were read at, so file links cannot drift. */
  sha: string;
  /**
   * Directory the file being parsed sits in, repo-relative, no trailing slash — `""` for the
   * README, `"docs"` for a file under `docs/`. Without it, `security.md` inside `docs/install.md` resolves
   * to the repo root and 404s: the same text means two different files depending on where it is.
   */
  dir?: string;
  /**
   * Repo paths this site publishes itself, mapped to the route that shows them —
   * `{"docs/sync.md": "/docs/app/sync"}`.
   *
   * THIS IS WHY THE LINKS ARE WORTH REWRITING AT ALL. These docs cross-reference each other
   * constantly, and every one of those links used to send a reader from this site to GitHub, mid
   * sentence, for a page this site is already showing. A link to something we publish stays here;
   * everything else — root specs, external sites — goes to the pinned commit as before.
   */
  routes?: Record<string, string>;
  /**
   * Where this repository's `docs/images/` is published on this site —
   * `/docs/images/app`.
   *
   * THE ONE FIELD COLLIE DOES NOT HAVE, and the multi-source shape forces it.
   * collie publishes one repository's images at `/docs/images/`, so a doc's
   * `images/x.png` reaches them by resolving against its own directory and
   * nothing else. Three repositories can each have an `images/x.png`, so each
   * one's images are published under its own component and a doc's relative
   * path has to be re-rooted rather than merely normalised.
   */
  imageRoute?: string;
}

/**
 * Built fresh per call, never shared. A module-level /g regex carries `lastIndex`, and
 * parseInline now recurses into link text — a shared one would have the inner call move the
 * outer call's cursor and silently drop the rest of the line.
 *
 * Alternation ORDER is load-bearing: `**bold**` has to be tried before `*em*`, or every bold run
 * parses as an italic containing a stray asterisk.
 */
const inlinePattern = (): RegExp =>
  // `_em_` is fenced by lookarounds, and that is not optional: these docs are full of
  // `MODEL_RUNTIME_URL` and `web-push`, and an unfenced `_..._` turns the middle of every
  // screaming-snake-case name into an italic. Markdown's own rule is the same one — an underscore
  // between two word characters is a character, not a marker.
  /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|(?<![\w_])_([^_\n]+)_(?![\w_])|\*([^*\n]+)\*/g;

/** Where every repository keeps the images its docs reference. */
export const IMAGES_DIR = 'docs/images';

/**
 * Fold `a/b/../c.md` down to `a/c.md`, and strip `./`.
 *
 * The docs reach the repo root with `../PROTOCOL.md`, and a path with `..` still in it neither
 * matches a route nor makes a usable GitHub URL.
 */
function normalise(path: string): string {
  const out: string[] = [];
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out.join('/');
}

/**
 * Resolve a link inside a copied doc so it still works from this origin.
 *
 * Three answers, in order:
 *   - `#anchor` — stays a fragment. It points into the same file, and this site shows that file on
 *     one page, so the anchor is already right. (It used to be rewritten to GitHub, because the
 *     site only showed PART of the README and the rest of it was not here to point at.)
 *   - a file this site publishes — the route that publishes it, with any `#anchor` kept.
 *   - anything else — that file at the exact commit these docs came from, never at `main`, so a
 *     link cannot start pointing at something the quoted text no longer describes.
 */
export function resolveHref(href: string, base: LinkBase): string {
  if (href.startsWith('#')) return href;
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return href;

  const hash = href.indexOf('#');
  const anchor = hash === -1 ? '' : href.slice(hash);
  const path = normalise(`${base.dir ?? ''}/${hash === -1 ? href : href.slice(0, hash)}`);

  const route = base.routes?.[path];
  if (route !== undefined) return `${route}${anchor}`;
  return `${base.repo}/blob/${base.sha}/${path}${anchor}`;
}

/**
 * Resolve a markdown image's `src` to something this site can actually serve.
 *
 * Unlike `resolveHref`, an image never leaves for GitHub. A link to a page this site does not
 * publish should send a reader to the file at the pinned commit — that is still a document GitHub
 * can show. An `<img>` pointed at a GitHub blob URL is not the same kind of fallback; it is this
 * site fetching an asset from another origin for something it is meant to own. So every relative
 * image resolves to a site-absolute path instead: `sync-docs.ts` copies each repository's
 * `docs/images/` into `public/docs/images/<component>/`, and `imageRoute` below is the site path
 * that directory is served at, the way every other asset under `public/` is served.
 *
 * An already-absolute URL (`https://…`) is left untouched — an external image is not this site's to
 * rehost.
 */
export function resolveImageSrc(src: string, base: LinkBase): string {
  if (/^[a-z][a-z\d+.-]*:/i.test(src)) return src;
  const path = normalise(`${base.dir ?? ''}/${src}`);
  const prefix = `${IMAGES_DIR}/`;
  // An image OUTSIDE `docs/images/` is left as the repo-relative path it is,
  // and that is not an oversight. `sync-docs.ts` checks every image block
  // against the files it actually copied, so this path matches nothing there
  // and the sync exits non-zero naming the file — which is the failure the
  // spec asks for, and a better one than silently publishing a broken <img>.
  if (base.imageRoute === undefined || !path.startsWith(prefix)) return `/${path}`;
  return `${base.imageRoute}/${path.slice(prefix.length)}`;
}

export function parseInline(text: string, base: LinkBase): Inline[] {
  const spans: Inline[] = [];
  let at = 0;
  const pattern = inlinePattern();
  let match = pattern.exec(text);
  while (match !== null) {
    if (match.index > at) spans.push({ kind: 'text', text: text.slice(at, match.index) });
    const [, linkText, href, strong, code, underscoreEm, starEm] = match;
    const em = underscoreEm ?? starEm;
    if (href !== undefined && linkText !== undefined) {
      // Recursed, not taken literally: the README tables are full of `[**Self-hosting**](./docs/self-hosting.md)`
      // and a flat capture renders the asterisks. A link's text cannot contain another link — the
      // pattern above stops at the first `]` — so this bottoms out in one step.
      spans.push({ kind: 'link', spans: parseInline(linkText, base), href: resolveHref(href, base) });
    } else if (strong !== undefined) {
      // Recursed for the same reason link text is: bold with code inside it is everywhere in these
      // docs, and a flat capture puts the backticks on the page.
      spans.push({ kind: 'strong', spans: parseInline(strong, base) });
    } else if (code !== undefined) {
      spans.push({ kind: 'code', text: code });
    } else if (em !== undefined) {
      spans.push({ kind: 'em', spans: parseInline(em, base) });
    }
    at = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (at < text.length) spans.push({ kind: 'text', text: text.slice(at) });
  return spans;
}

/** A markdown table row, minus its leading and trailing pipes. */
function cells(line: string): string[] {
  return line
    .replace(/^\s*\|/, '')
    .replace(/\|\s*$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const FENCE = /^```(\w*)\s*$/;
const BULLET = /^[-*]\s+(.*)$/;
const NUMBERED = /^\d+\.\s+(.*)$/;
const TABLE_RULE = /^\s*\|?[\s:-]*\|[\s|:-]*$/;
/** A whole line and nothing else — `![Settings, Updates row](images/updates/x.png)`. */
const IMAGE = /^!\[([^\]]*)\]\(([^)]+)\)\s*$/;

/**
 * How far into the line its first non-space character sits, with a tab worth four.
 *
 * Four and not eight: these docs are spaces throughout, and the one shape this has to judge is a
 * fence indented under a list item — a tab there is past any content column this reader produces
 * either way.
 */
function indentOf(line: string): number {
  let width = 0;
  for (const char of line) {
    if (char === ' ') width += 1;
    else if (char === '\t') width += 4;
    else break;
  }
  return width;
}

/** Strip up to `column` of leading indent, so a nested fence's body is not drawn pre-indented. */
function dedent(line: string, column: number): string {
  let at = 0;
  let width = 0;
  while (at < line.length && width < column) {
    const char = line[at];
    if (char === ' ') width += 1;
    else if (char === '\t') width += 4;
    else break;
    at += 1;
  }
  return line.slice(at);
}

export interface ParseResult {
  blocks: Block[];
  /** One line per thing this reader refused to guess at. */
  dropped: string[];
}

export function parseBlocks(markdown: string, base: LinkBase): ParseResult {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  const dropped: string[] = [];
  let i = 0;

  const flushParagraph = (buffer: string[]) => {
    if (buffer.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseInline(buffer.join(' ').trim(), base) });
    buffer.length = 0;
  };

  const paragraph: string[] = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      flushParagraph(paragraph);
      i += 1;
      continue;
    }

    // Raw HTML. Skipped whole, and named in `dropped` — the README uses it for the centred hero
    // image, which this site already shows in its own hero.
    if (/^\s*<[a-z]/i.test(line)) {
      flushParagraph(paragraph);
      const tag = /^\s*<([a-z][\w-]*)/i.exec(line)?.[1] ?? '?';
      dropped.push(`raw html <${tag}> at line ${i + 1}`);
      while (i < lines.length && lines[i].trim() !== '') i += 1;
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading !== null) {
      flushParagraph(paragraph);
      // PARSED, not taken raw. these headings carry inline code — "The `SERVER_SECRET`"
      // — and a heading was the one block that pushed its source string straight through, so the
      // backticks reached the page as characters. The flattened form is kept beside the tree for
      // the id and the table of contents; see the note on the `heading` block in `app/lib/docs.ts`.
      const spans = parseInline(heading[2].trim(), base);
      const text = spansText(spans);
      blocks.push({ kind: 'heading', level: heading[1].length, text, id: slugify(text), spans });
      i += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence !== null) {
      flushParagraph(paragraph);
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !FENCE.test(lines[i])) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // the closing fence
      blocks.push({ kind: 'code', lang: fence[1], text: body.join('\n').replace(/\s+$/, '') });
      continue;
    }

    const image = IMAGE.exec(line.trim());
    if (image !== null) {
      flushParagraph(paragraph);
      blocks.push({ kind: 'image', alt: image[1] ?? '', src: resolveImageSrc(image[2] ?? '', base) });
      i += 1;
      continue;
    }

    if (line.startsWith('>')) {
      flushParagraph(paragraph);
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        body.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', spans: parseInline(body.join(' ').trim(), base) });
      continue;
    }

    // A table is a header row, a rule, then rows — the rule is what tells it apart from a
    // paragraph that happens to contain pipes.
    if (line.trim().startsWith('|') && i + 1 < lines.length && TABLE_RULE.test(lines[i + 1])) {
      flushParagraph(paragraph);
      const head = cells(line).map((cell) => parseInline(cell, base));
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        rows.push(cells(lines[i]).map((cell) => parseInline(cell, base)));
        i += 1;
      }
      blocks.push({ kind: 'table', head, rows });
      continue;
    }

    const bullet = BULLET.exec(line);
    const numbered = NUMBERED.exec(line);
    if (bullet !== null || numbered !== null) {
      flushParagraph(paragraph);
      const ordered = numbered !== null;
      const items: { text: string; nested: Block[] }[] = [];
      /**
       * The column the item's own text starts in, taken from the marker that opened it — 3 for
       * `1. `, 2 for `- `. Anything indented to it belongs to the item; anything left of it has
       * left the list. A fence at column 0 after a step therefore still ends the list, which is
       * what markdown itself does and what these docs are written to.
       */
      let column = 0;
      /** Has this item already left its first line? A blank line or a nested block does that. */
      let broken = false;
      while (i < lines.length) {
        const current = lines[i];
        const next = ordered ? NUMBERED.exec(current) : BULLET.exec(current);
        if (next !== null) {
          items.push({ text: next[1], nested: [] });
          column = current.length - next[1].length;
          broken = false;
          i += 1;
          continue;
        }
        const item = items[items.length - 1];
        if (item === undefined) break;

        // A blank line stays inside the list ONLY while indented content follows it. Without the
        // lookahead a list would swallow the paragraph after it; without the blank line at all, a
        // fence under a step is unreachable, because that is how markdown spells it.
        if (current.trim() === '') {
          const after = lines[i + 1];
          if (after === undefined || indentOf(after) < column || after.trim() === '') break;
          broken = true;
          i += 1;
          continue;
        }

        if (!/^\s+\S/.test(current)) break;
        const body = dedent(current, column);
        const nestedFence = FENCE.exec(body);
        if (nestedFence !== null && indentOf(current) >= column) {
          const fenced: string[] = [];
          i += 1;
          while (i < lines.length && !FENCE.test(lines[i].trim())) {
            fenced.push(dedent(lines[i], column));
            i += 1;
          }
          i += 1; // the closing fence
          item.nested.push({
            kind: 'code',
            lang: nestedFence[1],
            text: fenced.join('\n').replace(/\s+$/, ''),
          });
          broken = true;
          continue;
        }

        if (!broken) {
          // A wrapped continuation line — README lists wrap at 100 columns.
          item.text += ` ${current.trim()}`;
          i += 1;
          continue;
        }

        // Indented prose after a blank line or a fence is a second paragraph of the same item,
        // not more of its first line: the two are separated on the page and joining them would
        // run a sentence into the command it follows.
        const rest: string[] = [];
        while (i < lines.length && lines[i].trim() !== '' && indentOf(lines[i]) >= column) {
          if (FENCE.test(dedent(lines[i], column))) break;
          rest.push(lines[i].trim());
          i += 1;
        }
        if (rest.length > 0) {
          item.nested.push({ kind: 'paragraph', spans: parseInline(rest.join(' '), base) });
        }
      }
      const nested = items.flatMap((item, at) => (item.nested.length === 0 ? [] : [{ item: at, blocks: item.nested }]));
      // The key is SET rather than spread in, so a list with nothing under any item emits exactly
      // the object it always did — the whole generated corpus stays byte-identical until a doc
      // actually nests something.
      const list: Extract<Block, { kind: 'list' }> = {
        kind: 'list',
        ordered,
        items: items.map((item) => parseInline(item.text, base)),
      };
      if (nested.length > 0) list.nested = nested;
      blocks.push(list);
      continue;
    }

    paragraph.push(line.trim());
    i += 1;
  }

  flushParagraph(paragraph);
  return { blocks, dropped };
}

/**
 * Pull one `## Heading` section out of a README, including any deeper headings under it.
 *
 * Returns null when the heading is gone, and the caller treats that as fatal. A sync that silently
 * produced a page with a missing section would be the whole failure mode of this idea: the site
 * would go on claiming to quote docs it no longer had.
 */
export function extractSection(markdown: string, heading: string): string | null {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => {
    const match = HEADING.exec(line);
    return match !== null && match[2].trim() === heading;
  });
  if (start === -1) return null;
  // SAFETY: `start` is the index findIndex returned for a line HEADING already matched, and the
  // regex is not sticky, so re-running it on that same line cannot fail.
  const level = (HEADING.exec(lines[start]) as RegExpExecArray)[1].length;
  let end = start + 1;
  while (end < lines.length) {
    const match = HEADING.exec(lines[end]);
    if (match !== null && match[1].length <= level) break;
    end += 1;
  }
  return lines.slice(start, end).join('\n');
}

/**
 * Pull the block that follows a standalone bold line, e.g. a README's `**Features**` list.
 *
 * The one part of this we want is not under a heading at all, and inventing one would be writing
 * copy rather than quoting it.
 */
export function extractAfterBoldLine(markdown: string, label: string): string | null {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === `**${label}**`);
  if (start === -1) return null;
  let end = start + 1;
  while (end < lines.length && !HEADING.test(lines[end])) end += 1;
  return lines.slice(start + 1, end).join('\n');
}
