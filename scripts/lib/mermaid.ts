/**
 * Draw the ```mermaid fences, once, at sync time.
 *
 * ── WHY THIS EXISTS AT ALL, AND WHY IT IS NOT A COMPONENT ──
 * collie-website draws its diagrams in the reader's browser, lazily, and that
 * is the right answer for a site whose pages are already an application. This
 * one prerenders every page to a file and serves it from nginx, and the point
 * of that arrangement is that a document is a document. Mermaid is larger than
 * the whole of this site put together, so shipping it to draw four boxes and an
 * arrow would cost a reader more than the words they came for.
 *
 * So the drawing is made here, by the person who edits the fence, and lands in
 * git beside the docs it explains. `app/` never imports mermaid and the browser
 * never sees it.
 *
 * ── FOUR FILES PER DIAGRAM, BECAUSE AN SVG BAKES IN BOTH ITS COLOURS AND ITS WORDS ──
 * The site has two appearances: the reader's system setting, and the override
 * the header toggle writes onto `<html>` as `data-theme`. A drawing cannot
 * follow a CSS variable it was flattened against, so light and dark are two
 * drawings and `<picture>` picks one. That costs no JavaScript and causes no
 * swap after paint, and it keeps working under the override because the
 * `dark:` variant in `app.css` is keyed to the same rules the tokens are.
 *
 * It has two languages for the same reason and with the same answer. A label is
 * the shortest prose the site publishes and the first thing a reader looks at,
 * so the German page gets a German drawing, made here by substituting the
 * translated labels into the fence before it is rendered. Two appearances times
 * two languages is four files, and the language is in the file name because a
 * picture cannot pick its own words either. `sync-docs.ts` does the
 * substituting; this file is handed a name and a fence and draws what it is
 * given.
 *
 * ── THE PALETTE IS READ OUT OF `app/app.css`, NOT WRITTEN DOWN AGAIN ──
 * `readPalettes` finds the light and the dark block in the stylesheet BY THEIR
 * SELECTORS, not by their position, so a token change reaches the diagrams on
 * the next sync with no second edit here and an unrelated `:root` rule added
 * beside them changes nothing. See `readPalettes` for what it addresses. The
 * tokens are HSL triplets, which is the one respect in which this is EASIER
 * than collie's component: collie's tokens are `oklch`, mermaid's colour
 * library rejects that outright, and it has to paint each colour onto a canvas
 * pixel and read the bytes back to convert it. Three lines of trigonometry do
 * the same job here, and they can be tested.
 *
 * ── THE BROWSER IS THE ONE ALREADY ON THIS MACHINE ──
 * Mermaid has no renderer that is not a browser: `graph TD` is a layout
 * problem, and text measurement is what decides where the boxes go. Playwright
 * has already put a headless chromium in `~/.cache/ms-playwright/` on a laptop,
 * and a GitHub runner carries a system chrome, so `searchForBrowser` takes
 * whichever is here and downloads nothing. It drives it with two command-line switches
 * rather than a driver library, see `renderDiagrams`, so the only thing this file
 * adds to `package.json` is mermaid itself, as a devDependency. `sync:docs` is
 * a hand-run developer tool and the Dockerfile stays hermetic.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

/** `require.resolve` in a module file: the two paths below are into `node_modules`, not into this tree. */
const resolve = createRequire(import.meta.url).resolve;

/** The site's colour tokens, by their CSS custom property name without the leading dashes. */
export type Palette = Record<string, string>;

export interface Palettes {
  light: Palette;
  dark: Palette;
}

/**
 * The tokens a diagram needs, and it is deliberately a short list.
 *
 * Mermaid has upwards of a hundred theme variables and setting more of them is
 * how a diagram ends up looking like neither the page nor mermaid. Every name
 * here must exist in `app/app.css`; a rename there fails the sync rather than
 * quietly drawing the diagram in mermaid's own lavender.
 */
export const TOKENS = ['background', 'foreground', 'card', 'muted', 'muted-foreground', 'border'] as const;

/** The font the drawing is measured and drawn in: the site's body stack, which is the system's. */
export const FONT_FAMILY =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** `192 34% 96%` as `#eff6f7`. Mermaid's colour library is given hex and never asked to parse CSS. */
export function hslToHex(triplet: string): string {
  const match = /^\s*(?<h>[\d.]+)\s+(?<s>[\d.]+)%\s+(?<l>[\d.]+)%\s*$/.exec(triplet);
  if (match?.groups === undefined) {
    throw new Error(`mermaid: "${triplet}" is not an HSL triplet, so app.css no longer holds what this reads.`);
  }
  const hue = Number(match.groups['h']);
  const saturation = Number(match.groups['s']) / 100;
  const lightness = Number(match.groups['l']) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const base = lightness - chroma / 2;
  const sector = Math.floor(hue / 60) % 6;
  const rgb =
    sector === 0 ? [chroma, second, 0]
    : sector === 1 ? [second, chroma, 0]
    : sector === 2 ? [0, chroma, second]
    : sector === 3 ? [0, second, chroma]
    : sector === 4 ? [second, 0, chroma]
    : [chroma, 0, second];
  return `#${rgb
    .map((value) =>
      Math.round((value + base) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

/** One block of the stylesheet: what it selects, and the declarations inside it. */
interface CssBlock {
  selector: string;
  body: string;
}

/**
 * Every innermost `{ ... }` block in the file, with the selector that opens it.
 *
 * The body pattern excludes braces, so a block that holds another one, `@layer`
 * and `@media`, is never itself a candidate: what comes back is the leaf blocks
 * and the selector is whatever was written between the enclosing brace and this
 * one. Quotes are normalised to single, because `[data-theme='dark']` and
 * `[data-theme="dark"]` select the same element and neither reading should
 * decide whether the diagrams get a palette.
 */
function cssBlocks(css: string): CssBlock[] {
  return [...css.matchAll(/(?<selector>[^{}]*)\{(?<body>[^{}]*)\}/g)].map((match) => ({
    selector: (match.groups?.['selector'] ?? '').trim().replaceAll(/\s+/g, ' ').replaceAll('"', "'"),
    body: match.groups?.['body'] ?? '',
  }));
}

/** The tokens of one block, as hex, or a throw naming the first one that is not there. */
// Not annotated `: Palette`: the lint gate reads an explicit open dictionary on a
// return as discarded evidence, and `palette` is already declared as one below.
function paletteOf(options: { block: CssBlock; cssFile: string; appearance: string }) {
  const palette: Palette = {};
  for (const declaration of options.block.body.matchAll(/--(?<name>[\w-]+)\s*:\s*(?<value>[^;]+);/g)) {
    const name = declaration.groups?.['name'] ?? '';
    const value = (declaration.groups?.['value'] ?? '').trim();
    if (TOKENS.some((token) => token === name)) palette[name] = hslToHex(value);
  }
  for (const token of TOKENS) {
    if (palette[token] === undefined) {
      throw new Error(
        `mermaid: the ${options.appearance} block in ${options.cssFile} has no --${token}, which the diagrams need.`,
      );
    }
  }
  return palette;
}

/** The one block this appearance is written in, or a throw saying there are none or several. */
function soleBlock(options: { blocks: CssBlock[]; cssFile: string; appearance: string; wanted: string }): CssBlock {
  const [first, ...rest] = options.blocks;
  if (first === undefined) {
    throw new Error(
      `mermaid: ${options.cssFile} holds no ${options.appearance} palette. ` +
        `The diagrams read ${options.wanted}, so that block has to exist under that exact selector.`,
    );
  }
  if (rest.length > 0) {
    throw new Error(
      `mermaid: ${options.cssFile} holds ${rest.length + 1} blocks that could be the ${options.appearance} ` +
        `palette (${options.wanted}), and this cannot choose between them.`,
    );
  }
  return first;
}

/**
 * The site's two palettes, read from the stylesheet.
 *
 * ── NAMED, NOT COUNTED ──
 * This used to take the first two `:root` blocks in the file and call them
 * light and dark, in that order. That reading survives exactly as long as
 * nobody else writes `:root` for anything, and the theme toggle needed three
 * more: a dark block under `[data-theme='dark']`, and a `color-scheme` rule per
 * state. The count then said three, the second block was `color-scheme: light
 * dark` with no tokens in it, and the build stopped on "app.css has no
 * --background" while every colour on the site was where it had always been.
 *
 * So each appearance is addressed by what it IS. Light is the block whose
 * selector is exactly `:root` and which declares `--background`, which is the
 * unconditional palette and not the `color-scheme` rule beside it. Dark is
 * `:root[data-theme='dark']`, the override the toggle writes, and it is asked
 * for `--background` too, because that same selector carries a `color-scheme`
 * rule further down the file and a rule with no tokens in it is not a palette.
 * It holds the same values as the media query and is the copy an attribute
 * selector can be matched against without parsing the query. A missing block, a duplicated one
 * or a missing token fails loudly and by name: a diagram drawn in the wrong
 * half of the palette is not something a reviewer notices from a diff.
 *
 * `tests/unit/theme.test.ts` is what keeps the dark block this reads and the
 * dark block the media query carries identical, so reading either one here is
 * reading both.
 */
export function readPalettes(cssFile: string): Palettes {
  const blocks = cssBlocks(readFileSync(cssFile, 'utf8'));
  const light = soleBlock({
    blocks: blocks.filter((block) => block.selector === ':root' && block.body.includes('--background:')),
    cssFile,
    appearance: 'light',
    wanted: "a `:root` block declaring `--background`",
  });
  const dark = soleBlock({
    blocks: blocks.filter(
      (block) => block.selector === ":root[data-theme='dark']" && block.body.includes('--background:'),
    ),
    cssFile,
    appearance: 'dark',
    wanted: "a `:root[data-theme='dark']` block declaring `--background`",
  });
  return {
    light: paletteOf({ block: light, cssFile, appearance: 'light' }),
    dark: paletteOf({ block: dark, cssFile, appearance: 'dark' }),
  };
}

/**
 * The theme variables mermaid is given, and the whole list of them.
 *
 * A named contract rather than a bag of strings, so the set is a decision this
 * file makes once and not a shape that drifts between the two palettes.
 */
export interface ThemeVariables {
  background: string;
  mainBkg: string;
  primaryColor: string;
  primaryTextColor: string;
  primaryBorderColor: string;
  nodeBorder: string;
  lineColor: string;
  edgeLabelBackground: string;
  textColor: string;
  secondaryColor: string;
  tertiaryColor: string;
  clusterBkg: string;
  clusterBorder: string;
}

/**
 * The page's colours, in the names mermaid uses for them.
 *
 * Lifted from collie's component, which arrived at this set by drawing with it.
 * `--card` is the site's "a distinct block sits here" surface and a node is
 * exactly that; an edge label sits ON its line, so it needs the page ground
 * behind it or the line strikes through the words.
 */
export function themeVariables(palette: Palette): ThemeVariables {
  const ground = palette['background'] ?? '';
  const ink = palette['foreground'] ?? '';
  const rule = palette['border'] ?? '';
  const quiet = palette['muted-foreground'] ?? '';
  const surface = palette['card'] ?? '';
  const shade = palette['muted'] ?? '';
  return {
    background: ground,
    mainBkg: surface,
    primaryColor: surface,
    primaryTextColor: ink,
    primaryBorderColor: rule,
    nodeBorder: rule,
    lineColor: quiet,
    edgeLabelBackground: ground,
    textColor: ink,
    secondaryColor: shade,
    tertiaryColor: shade,
    clusterBkg: shade,
    clusterBorder: rule,
  };
}

/**
 * What a committed SVG was drawn WITH, as sixteen hex characters.
 *
 * The diagram's own id is a hash of its source, which is what keeps an
 * unchanged diagram from being re-rendered, but it says nothing about the
 * palette or the mermaid version, and both of those change the drawing. So the
 * fingerprint is written into the file as a comment and the sync re-renders any
 * drawing whose comment no longer matches. That is what makes "a token change
 * reaches the diagrams on the next sync" true rather than aspirational, without
 * redrawing the whole corpus on every run.
 */
export function fingerprint(palettes: Palettes, version: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ palettes, version, font: FONT_FAMILY }))
    .digest('hex')
    .slice(0, 16);
}

/**
 * The same fingerprint, narrowed to ONE FILE, because two files of one diagram
 * no longer hold the same words.
 *
 * A diagram's id is a hash of the ENGLISH fence, and it is what keeps a fence
 * nobody touched from being redrawn. Since the labels are translated and the
 * drawing is made once per language, that id says nothing about the words in
 * the German copy: buying a label changes the picture without changing the
 * fence, the id, the palette or the mermaid version. So the words actually
 * drawn are hashed into the file's own stamp, and a German drawing made before
 * its labels were bought is redrawn on the next sync by exactly the same
 * mechanism a palette change already used.
 */
export function drawnWith(mark: string, source: string): string {
  return `${mark}/${createHash('sha256').update(source).digest('hex').slice(0, 12)}`;
}

/** The comment every rendered file opens with, and the thing the sync reads to decide on a redraw. */
export function stamp(id: string, mark: string): string {
  return `<!-- openplate diagram ${id}, drawn by pnpm sync:docs, palette ${mark} -->`;
}

export interface DiagramJob {
  /**
   * The file name this drawing will be written under, without its variant or its extension.
   *
   * `<content hash>-<language>`, built by `sync-docs.ts`: the hash is the one `markdown.ts` gave
   * the ENGLISH fence, and the language is there because the same fence is drawn once per language
   * with its labels translated. This file does not know about languages and does not need to. It
   * takes a name and a fence, and the name is also what mermaid is told to call the drawing, so it
   * has to be unique across a run.
   */
  id: string;
  source: string;
  /** Where it was written, for the message when it will not parse, e.g. `app: docs/topologies.md (de)`. */
  where: string;
}

export interface Drawing {
  light: string;
  dark: string;
}

/** What a search for a browser on this machine found, and everywhere it looked. */
export interface BrowserSearch {
  /** The browser to run, or null when this machine carries none. */
  path: string | null;
  /** Every candidate considered, in order, whether or not it was there. */
  tried: string[];
}

/**
 * The names a system chrome goes by. `ubuntu-latest` on GitHub carries
 * `google-chrome`, which is why CI needs no download and no new dependency.
 */
const SYSTEM_BROWSERS = [
  'google-chrome',
  'google-chrome-stable',
  'chromium',
  'chromium-browser',
  'chrome-headless-shell',
];

/** The first entry of PATH that holds an executable of this name, or null. */
function onPath(name: string): string | null {
  const directories = (process.env['PATH'] ?? '').split(delimiter).filter((entry) => entry !== '');
  return directories.map((directory) => join(directory, name)).find((candidate) => existsSync(candidate)) ?? null;
}

/**
 * Where the browser is, asked in a way that a caller can act on.
 *
 * ── WHY THIS IS NOT JUST `findBrowser` ──
 * Three callers ask the same question and want three different answers to a
 * miss. The renderer wants a path or a sentence. The workflow wants a path to
 * put in `OPENPLATE_CHROME`, and the whole list when there is none, because a
 * CI step that fails has nobody to ask. The unit tier wants to SKIP its drawing
 * cases, and a thrown error is no way to ask a yes or no question. So the
 * search returns its result and its working, and `findBrowser` is the one line
 * that turns a miss into a throw.
 *
 * On 2026-09-07 run 34099274684 the unit tier went red on a runner for want of
 * a browser, and the sync step in the same run passed because it had nothing
 * new to draw. Nothing here downloads anything: a laptop has the headless
 * chromium playwright unpacked under `~/.cache/ms-playwright`, and a runner has
 * a system chrome on PATH.
 */
export function searchForBrowser(): BrowserSearch {
  const tried: string[] = [];

  // AN OVERRIDE IS THE ANSWER, RIGHT OR WRONG. Somebody who names a browser has
  // said which one to draw with. Falling through to another one behind their
  // back turns a typo into a run that drew with something nobody chose.
  const override = process.env['OPENPLATE_CHROME'] ?? '';
  if (override !== '') {
    tried.push(`OPENPLATE_CHROME=${override}`);
    // A bare name is a command and is looked up on PATH; anything with a slash
    // is a path and is taken as one.
    if (!override.includes('/')) return { path: onPath(override), tried };
    return { path: existsSync(override) ? override : null, tried };
  }

  // The headless SHELL before the full browser: it is the smaller of the two
  // downloads and it is what playwright itself uses for a headless run. Highest
  // build first, so a laptop draws with the newest chromium it has.
  const cache = join(homedir(), '.cache', 'ms-playwright');
  // NAMED EVEN WHEN IT IS NOT THERE. A missing cache contributes no candidate
  // paths, and a failure that lists none of them reads as if the search never
  // looked, which is the first thing somebody would check.
  if (!existsSync(cache)) tried.push(`${cache} (no such directory)`);
  const unpacked = (existsSync(cache) ? readdirSync(cache) : [])
    .filter((entry) => entry.startsWith('chromium'))
    .toSorted((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()))
    .flatMap((entry) => [
      join(cache, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
      join(cache, entry, 'chrome-linux', 'chrome'),
    ]);
  for (const candidate of unpacked) {
    tried.push(candidate);
    if (existsSync(candidate)) return { path: candidate, tried };
  }

  // A SYSTEM BROWSER LAST. It is what makes a runner work with no install step,
  // and taking it last means a machine that has both goes on drawing with the
  // same build it drew the committed SVGs with.
  for (const name of SYSTEM_BROWSERS) {
    tried.push(`${name} on PATH`);
    const found = onPath(name);
    if (found !== null) return { path: found, tried };
  }

  return { path: null, tried };
}

/** The browser to draw with. Throws, naming every place it looked, when there is none. */
export function findBrowser(): string {
  const search = searchForBrowser();
  if (search.path === null) {
    throw new Error(
      'mermaid: no chromium found on this machine. Install one with `npx playwright install ' +
        'chromium-headless-shell`, or point OPENPLATE_CHROME at a chrome you already have.\n' +
        `  Looked at:\n    ${search.tried.join('\n    ')}`,
    );
  }
  return search.path;
}

/**
 * How to start that browser FROM HERE, which is not always by running it.
 *
 * ── THE TOOLBOX CANNOT RUN IT, AND THAT IS NOT A BUG TO FIX HERE ──
 * Every node command in this workspace runs inside the `ts-dev` toolbox, and
 * the toolbox is a bare Ubuntu with no desktop libraries in it: chromium dies
 * on `libnspr4.so: cannot open shared object file` before it prints a version.
 * The host has those libraries and the same browser binary, at the same path,
 * because the toolbox shares `$HOME`.
 *
 * `flatpak-spawn --host` is how a program inside the container reaches out and
 * runs something on the host, and it is already how this milestone's nginx
 * check does the same thing for the same reason. So: run the browser directly
 * when that works, reach the host when it does not, and say so plainly when
 * neither is possible. A contributor should read a sentence, not a linker
 * error out of a subprocess they did not know existed.
 */
export interface BrowserCommand {
  /** The program to run, which is the browser itself or the thing that reaches the host. */
  file: string;
  /** What must come before the browser's own switches. Empty when `file` IS the browser. */
  prefix: string[];
}

export function browserCommand(executable: string): BrowserCommand {
  const direct = spawnSync(executable, ['--version'], { encoding: 'utf8' });
  if (direct.status === 0) return { file: executable, prefix: [] };

  const host = spawnSync('flatpak-spawn', ['--host', executable, '--version'], { encoding: 'utf8' });
  if (host.status === 0) return { file: 'flatpak-spawn', prefix: ['--host', executable] };

  throw new Error(
    `mermaid: ${executable} will not start here.\n` +
      '  Inside the ts-dev toolbox that is normal: the container has no libnspr4/libnss3, and the\n' +
      '  browser lives on the host. Either run `pnpm sync:docs` on the host, or make\n' +
      '  `flatpak-spawn --host` reachable from this shell.\n' +
      `  The browser said: ${(direct.stderr || direct.error?.message || '').trim()}`,
  );
}

/** The mermaid version in `node_modules`, which is part of what a committed drawing was made with. */
export function mermaidVersion(): string {
  // SAFETY: our own devDependency's manifest, read for one string; a package
  // with no version is a broken install and the `??` says so rather than crashing.
  const manifest = JSON.parse(readFileSync(resolve('mermaid/package.json'), 'utf8')) as { version?: string };
  return manifest.version ?? 'unknown';
}

/**
 * The page that does the drawing.
 *
 * Mermaid's UMD bundle is INLINED rather than linked, because the page is
 * opened over `file://` and a `file://` subresource is a fight nobody needs to
 * have. The jobs go in base64 for the same reason a payload always does: a
 * diagram source is full of quotes, angle brackets and `</`, and any one of
 * them ends a `<script>` early.
 */
function page(bundle: string, jobs: DiagramJob[], themes: { light: unknown; dark: unknown }): string {
  const payload = Buffer.from(JSON.stringify({ jobs, themes, font: FONT_FAMILY }), 'utf8').toString('base64');
  return `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body><div id="payload" data-jobs="${payload}"></div>
<script>${bundle}</script>
<script>
(async () => {
  const out = document.getElementById('payload');
  const decode = (text) => new TextDecoder().decode(Uint8Array.from(atob(text), (c) => c.charCodeAt(0)));
  const answer = { drawings: {}, errors: [] };
  try {
    const { jobs, themes, font } = JSON.parse(decode(out.dataset.jobs));
    const namespace = __esbuild_esm_mermaid_nm.mermaid;
    const mermaid = namespace.default ?? namespace;
    for (const variant of ['light', 'dark']) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        fontFamily: font,
        // \`useMaxWidth\` is what lets the drawing shrink into a phone instead of
        // setting its own width and pushing a scrollbar onto the whole page.
        flowchart: { useMaxWidth: true, htmlLabels: false },
        themeVariables: themes[variant],
      });
      for (const job of jobs) {
        try {
          // THE DIAGRAM'S OWN ID, not its position in this run. Mermaid writes
          // the id it is given into the SVG and into every internal reference in
          // it, so a position would make the bytes depend on which OTHER
          // diagrams happened to be redrawn in the same run, and an untouched
          // drawing would land in a diff the next time the whole set was drawn.
          const { svg } = await mermaid.render('d' + job.id + '-' + variant, job.source);
          (answer.drawings[job.id] ??= {})[variant] = svg;
        } catch (error) {
          answer.errors.push(job.where + ': ' + (error && error.message ? error.message : String(error)));
        }
      }
    }
  } catch (error) {
    answer.errors.push('the renderer itself failed: ' + (error && error.message ? error.message : String(error)));
  }
  // CHUNKED, because the corpus is a quarter of a megabyte of SVG and
  // \`String.fromCharCode(...bytes)\` is one argument per byte: spreading the
  // whole thing overflows the call stack and the page dies with no answer at
  // all, which reads from Node as a browser that never finished.
  const bytes = new TextEncoder().encode(JSON.stringify(answer));
  let binary = '';
  for (let at = 0; at < bytes.length; at += 0x8000) binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  const encoded = btoa(binary);
  document.body.replaceChildren();
  const result = document.createElement('div');
  result.id = 'result';
  result.setAttribute('data-answer', encoded);
  document.body.append(result);
})();
</script></body></html>`;
}

/** The drawn SVGs, by diagram id. Throws, naming the file, for any fence that will not parse. */
export function renderDiagrams(options: { jobs: DiagramJob[]; palettes: Palettes }): Map<string, Drawing> {
  const drawings = new Map<string, Drawing>();
  if (options.jobs.length === 0) return drawings;

  const browser = browserCommand(findBrowser());
  const bundle = readFileSync(resolve('mermaid/dist/mermaid.min.js'), 'utf8');
  const themes = { light: themeVariables(options.palettes.light), dark: themeVariables(options.palettes.dark) };

  // `/tmp` and not a directory in the repo: the page is scratch, it is three
  // and a half megabytes of inlined bundle, and it must never be mistaken for
  // something committed. The toolbox and the host share `/tmp`, so the `file://`
  // URL means the same thing on both sides of `flatpak-spawn`.
  const scratch = mkdtempSync(join(tmpdir(), 'openplate-mermaid-'));
  try {
    const html = join(scratch, 'render.html');
    writeFileSync(html, page(bundle, options.jobs, themes));
    const dom = execFileSync(
      browser.file,
      [
        ...browser.prefix,
        '--headless',
        '--disable-gpu',
        '--no-sandbox',
        `--user-data-dir=${join(scratch, 'profile')}`,
        // VIRTUAL TIME, not a sleep. `--dump-dom` alone prints the DOM at the
        // load event, and mermaid renders after it; the budget lets the page's
        // clock run ahead until its work is done, which takes about a quarter
        // of a second of real time for the whole corpus.
        '--virtual-time-budget=60000',
        '--dump-dom',
        `file://${html}`,
      ],
      { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] },
    );

    const encoded = /<div id="result" data-answer="(?<answer>[^"]*)">/.exec(dom)?.groups?.['answer'];
    if (encoded === undefined) {
      throw new Error('mermaid: the browser produced no answer, so it did not reach the end of the page.');
    }
    // SAFETY: our own page's own payload, and the shape below is the one it
    // built four lines above. A malformed one throws here, which is right.
    const answer = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as {
      drawings: Record<string, { light?: string; dark?: string }>;
      errors: string[];
    };
    // DEDUPED, because every diagram is drawn twice and a fence that will not
    // parse will not parse in either palette. One broken fence is one message.
    const errors = [...new Set(answer.errors)];
    if (errors.length > 0) {
      throw new Error(`mermaid: ${errors.length} diagram(s) did not render:\n  ${errors.join('\n  ')}`);
    }

    for (const job of options.jobs) {
      const drawn = answer.drawings[job.id];
      if (drawn?.light === undefined || drawn.dark === undefined) {
        throw new Error(`mermaid: ${job.where} produced no drawing, and reported no error either.`);
      }
      drawings.set(job.id, { light: drawn.light, dark: drawn.dark });
    }
    return drawings;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
