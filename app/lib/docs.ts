/**
 * The shape of openplate's documentation, once it has been pulled out of the
 * three repositories that write it.
 *
 * Both sides of the pipeline use these types: `scripts/lib/markdown.ts`
 * produces them and `app/components/doc-blocks.tsx` renders them. That is the
 * point of a structured tree rather than a string of HTML — the site never
 * injects markup it did not build, and the doc text picks up this page's own
 * typography instead of arriving with a stylesheet of its own.
 *
 * PORTED FROM collie-website's `src/lib/docs.ts`. What one dimension of drift
 * costs is written on `DocComponent` below; everything else here is collie's,
 * including the reasoning, because the reasoning still holds.
 */

/**
 * The three programs openplate is built from, and the first segment of every
 * documentation URL.
 *
 * THE ONE THING THIS SITE HAS THAT COLLIE'S DOES NOT. collie documents one
 * repository, so a doc is addressed by its slug alone. Three repositories can
 * and do use the same slug for different files — `configuration.md` exists in
 * the app's docs and in the inference runtime's — so the component is part of
 * the address rather than a label on the page.
 */
export const DOC_COMPONENTS = ['app', 'sync', 'inference'] as const;

export type DocComponent = (typeof DOC_COMPONENTS)[number];

/**
 * One run of inline text.
 *
 * `strong`, `em` and `link` all carry a SPAN LIST rather than a string, because
 * all three of them nest in the docs and a flat capture renders the markers.
 * `**Every write is appended to `<state-dir>/audit.log`**` is bold with code
 * inside it, and forty more like it; a `text` field would have put the
 * backticks on the page.
 */
export type Inline =
  | { kind: 'text'; text: string }
  | { kind: 'strong'; spans: Inline[] }
  | { kind: 'em'; spans: Inline[] }
  | { kind: 'code'; text: string }
  | { kind: 'link'; spans: Inline[]; href: string };

export type Block =
  /**
   * A heading, and it carries BOTH forms of its own text.
   *
   * `spans` is what the page draws. These docs put inline code in their
   * headings — "The `SERVER_SECRET`", "Run `pnpm dev`" — and a flat string
   * prints the backticks as characters.
   *
   * `text` is the same run FLATTENED, and it is not redundant. Two callers need
   * a string rather than a tree: `slugify` builds the anchor id from it, and
   * the contents rail sets it small, where a `<code>` chip is noise.
   */
  | { kind: 'heading'; level: number; text: string; id: string; spans: Inline[] }
  | { kind: 'paragraph'; spans: Inline[] }
  /**
   * A list, and the blocks that sit UNDER one of its items.
   *
   * `nested` is a sidecar keyed by item index rather than a field on the item.
   * A fenced block indented under a step is part of that step: "then bring the
   * stack up:" and then the command. Parsed as a sibling of the list it draws
   * flush left, outside the step-number grid, reading as the end of the list
   * rather than as the third step's command.
   */
  | {
      kind: 'list';
      ordered: boolean;
      items: Inline[][];
      nested?: { item: number; blocks: Block[] }[];
    }
  | { kind: 'code'; lang: string; text: string }
  | { kind: 'quote'; spans: Inline[] }
  | { kind: 'table'; head: Inline[][]; rows: Inline[][][] }
  /**
   * A standalone `![alt](src)` line — the one image shape these docs use.
   *
   * `src` is already a site-absolute path such as
   * `/docs/images/app/topology.png` by the time it reaches this tree:
   * `scripts/lib/markdown.ts` resolves it the way it resolves a link, and
   * `sync-docs.ts` copies the file it names into `public/docs/images/`. Nothing
   * that renders this block does path math of its own.
   */
  | { kind: 'image'; src: string; alt: string }
  /**
   * A ```mermaid fence, ALREADY DRAWN.
   *
   * The one block whose content is not on this page. `sync:docs` renders the
   * fence with a headless browser and commits
   * `public/docs/diagrams/<id>-<language>-{light,dark}.svg`; the page shows the
   * pair its own language named and, within it, whichever copy the reader's
   * lights ask for. Four files per diagram and not two, because the labels are
   * translated and an SVG has its words baked in as firmly as its colours. Mermaid has no renderer that is
   * not a browser, and this site prerenders every page to a file and serves it
   * from nginx, so drawing in the reader's browser would put a library larger
   * than the whole site on a documentation page. It is drawn once instead, by
   * the person who wrote the fence, and lands in git beside the words.
   *
   * `id` IS THE CONTENT, HASHED. Not a slug and not a counter: the file names
   * are derived from the source, so a diagram nobody touched is neither
   * re-rendered nor re-committed, and two documents that draw the same thing
   * share one drawing. `source` is the fence as it was written, which the page
   * still shows behind a disclosure: the drawing is a picture of it, and a
   * reader who wants to copy the thing that made it can.
   *
   * `alt` IS SPANS AND NOT A STRING, and that is the whole reason the block
   * carries an accessible description at all rather than leaning on the source.
   * It is prose, it is the sentence a screen reader gets instead of a drawing,
   * and spans are the shape every other sentence in this tree is in, so
   * `collectBlock` and `rebuildBlock` in `app/lib/docs-i18n.server.ts`
   * translate it exactly like a paragraph, with no case of their own. The
   * diagram SOURCE carried here is the ENGLISH fence, always: it is what the
   * page offers behind its disclosure, and it is what `diagramLabels` below is
   * read out of when the German drawing is made at sync time.
   */
  | { kind: 'diagram'; id: string; source: string; alt: Inline[] };

/** One documentation file of one component, whole. */
export interface DocFile {
  component: DocComponent;
  /** The site's URL segment, and the generated module's name. */
  slug: string;
  /** The path in the source repository, e.g. `docs/self-hosting.md`. */
  file: string;
  /** The file's own `# ` title. */
  title: string;
  blocks: Block[];
}

/** One row of a README's documentation table — the site's docs nav, in the repo's order. */
export interface DocEntry {
  slug: string;
  file: string;
  /** The link text in the README table, e.g. "Self-hosting". */
  title: string;
  /** The README's own one-line description. Spans, because it carries code and links. */
  blurb: Inline[];
}

export interface DocSource {
  /** The repository's web address, e.g. `https://github.com/LowCarbCheck/openplate`. */
  repo: string;
  /**
   * The ref the words were READ FROM, and it is a release tag whenever there
   * is one.
   *
   * The site documents what a reader can run. `main` documents what they cannot
   * yet, and the gap between the two is the kind of wrong nobody reports,
   * because the page is internally consistent and simply describes a different
   * program.
   */
  ref: string;
  /**
   * The branch an edit should LAND ON, which is not the ref above.
   *
   * You cannot commit to a tag. `edit/v0.10.1/docs/sync.md` is not an edit
   * link, so the link at the foot of every doc page needs a branch even though
   * the words came from a tag.
   */
  editRef: string;
  sha: string;
  /**
   * The date `sha` was COMMITTED, not the date the sync ran.
   *
   * A timestamp of the run makes the generated index differ on every run even
   * when nothing upstream changed, so the "nothing changed, stop here" test can
   * never pass and a scheduled sync commits and deploys daily for nothing.
   */
  committedAt: string;
}

/** One component's documentation, without loading a page of it. */
export interface ComponentDocs {
  component: DocComponent;
  source: DocSource;
  /**
   * The repository's README lead: every block between its `# ` title and its first `##`.
   *
   * THE ONE PARAGRAPH A REPOSITORY WRITES FOR SOMEBODY WHO HAS NEVER HEARD OF IT. Every other
   * thing this site quotes is written for a reader who has already arrived, and a flagship
   * document's own lead is the worst of them: PROTOCOL.md opens by telling you it is normative and
   * where its machine-readable counterpart lives, because its reader is implementing the wire
   * protocol. A README's first paragraph is the only text in these repositories aimed at a
   * newcomer, so it is the only text fit for the front page. See `app/lib/stack-sections.ts`.
   *
   * Kept whole rather than trimmed to the first paragraph here, because what is quoted is a
   * decision for the page and not for the sync.
   */
  lead: Block[];
  /** The README documentation table, in the README's order. */
  entries: DocEntry[];
}

/**
 * Everything the site knows about the documentation without loading a file.
 *
 * Small on purpose — this is imported by the nav, which every doc page renders,
 * and each `DocFile` is not. The rows and the provenance are a few kilobytes;
 * the fifteen files together are not.
 */
export interface DocsIndex {
  app: ComponentDocs;
  sync: ComponentDocs;
  inference: ComponentDocs;
}

/**
 * Every page of one component, by slug.
 *
 * An index signature and not a `Record`, so a generated module can be annotated
 * with a NAME rather than with a mapped type — see `docs-registry.ts`, which is
 * imported by route loaders alone.
 */
export interface DocPages {
  [slug: string]: DocFile;
}

export interface DocsRegistry {
  app: DocPages;
  sync: DocPages;
  inference: DocPages;
}

/** One `## <version> - <date>` section of a CHANGELOG. */
export interface Release {
  /** `0.10.1`, without the brackets a Keep a Changelog heading wraps it in. */
  version: string;
  /** `2026-09-04`, as the changelog wrote it. */
  date: string;
  blocks: Block[];
}

export interface ComponentReleases {
  component: DocComponent;
  source: DocSource;
  /** Newest first. */
  releases: Release[];
}

export interface ReleasesRegistry {
  app: ComponentReleases;
  sync: ComponentReleases;
  inference: ComponentReleases;
}

/**
 * The page a slug names, or `null` when no component publishes it.
 *
 * A route parameter is a string a reader can type, so this is the boundary
 * where "app" and "self-hosting" become a component and a page or become a 404.
 */
export function findDoc(registry: DocsRegistry, component: DocComponent, slug: string): DocFile | null {
  const pages = registry[component];
  return Object.hasOwn(pages, slug) ? pages[slug] : null;
}

/** The component a URL segment names, or `null` — the same boundary, one level up. */
export function findComponent(segment: string): DocComponent | null {
  return DOC_COMPONENTS.find((component) => component === segment) ?? null;
}

/**
 * GitHub's heading-slug rules: lowercase, drop punctuation, every space becomes
 * a dash.
 *
 * ONE DASH PER SPACE, never a collapse. The docs link to their own headings
 * using GitHub's anchors, written by hand — and a heading with an em dash in it
 * loses the dash and keeps the two spaces around it, so GitHub's anchor has two
 * dashes there. Collapsing runs of whitespace gives that heading an id with
 * one, and every hand-written link to it silently scrolls nowhere.
 *
 * THE UNDERSCORE IS KEPT, which is the one place this departs from the function
 * it was ported from. GitHub keeps it, these docs are full of headings naming an
 * environment variable (`FOOD_SOURCE`), and a reader copying an
 * anchor from GitHub into a doc would land on a page that scrolls nowhere.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replaceAll(/\s/g, '-');
}

/**
 * An inline run, flattened to plain text.
 *
 * For the places a blurb has to be a STRING rather than a tree: the sidebar
 * sets it small under a title, where a `<code>` chip is noise rather than
 * signal, and — the reason this exists at all — the sidebar's blurb sits inside
 * the row's `<a>`. `Spans` renders a `link` span as an anchor, and an anchor
 * inside an anchor is invalid HTML that browsers silently un-nest, breaking the
 * row.
 */
export function spansText(spans: Inline[]): string {
  return spans
    .map((span) => (span.kind === 'text' || span.kind === 'code' ? span.text : spansText(span.spans)))
    .join('');
}

/**
 * One label inside a diagram fence: a run of text in double quotes.
 *
 * ── QUOTING IS THE CONTRACT, AND IT IS WHY THIS IS NOT A MERMAID PARSER ──
 * A diagram is drawn once, at sync time, with its words baked into the SVG, so
 * a German page showing an English drawing is a page whose picture argues with
 * the paragraph above it. The fix is not to hand the fence to a translator: a
 * model given a fence localises a node id, an arrow or a shell command in a
 * click handler. It is to lift the LABELS out, translate those as text, and put
 * them back where they came from.
 *
 * That substitution is only safe because a label is always quoted. Every fence
 * this site draws is written by us, in the three openplate repositories, and
 * `scripts/lib/markdown.ts` fails the sync for a flowchart label that is not in
 * double quotes. So the start and the end of a label are characters and not a
 * guess, and nothing here has to know what a subgraph, a cylinder or an arrow
 * kind is. A regex that guessed where an unquoted label ended is how a diagram
 * silently loses its last word.
 */
const DIAGRAM_LABEL = /"([^"\n]*)"/g;

/** A comment line inside a fence: mermaid's own `%%`, which carries no label a reader sees. */
const DIAGRAM_COMMENT = /^\s*%%/;

/**
 * Every label a fence puts on the drawing, in the order it wrote them, once each.
 *
 * Deduped, because two arrows carrying "managed instances only" are one
 * sentence to buy and one substitution to make. Returns nothing at all for a
 * fence that quotes nothing, which is a real and accepted case: a sequence
 * diagram writes its messages after a colon, its grammar has no quoting, and
 * the words in it are wire lines rather than prose. Such a diagram renders in
 * English in every language, by the same fallback as a missing translation.
 */
export function diagramLabels(source: string): string[] {
  const labels = new Set<string>();
  for (const line of source.split('\n')) {
    if (DIAGRAM_COMMENT.test(line)) continue;
    for (const match of line.matchAll(DIAGRAM_LABEL)) {
      const label = match[1] ?? '';
      if (label.trim() !== '') labels.add(label);
    }
  }
  return [...labels];
}

/**
 * The same fence with its labels replaced, and nothing else touched.
 *
 * Node ids, arrow kinds, subgraph nesting, comments and every character outside
 * a pair of quotes come through byte for byte, because the only thing this
 * rewrites is what the regex above matched. A label with no entry in `labels`
 * keeps its English, which is a state the caller is expected to have ruled out
 * already: the fallback for a half translated diagram is a whole English one,
 * and that decision belongs one level up, in `docs-i18n.server.ts`.
 */
export function withDiagramLabels(source: string, labels: Map<string, string>): string {
  return source
    .split('\n')
    .map((line) => {
      if (DIAGRAM_COMMENT.test(line)) return line;
      return line.replaceAll(DIAGRAM_LABEL, (whole, label: string) => {
        const replacement = labels.get(label);
        return replacement === undefined ? whole : `"${replacement}"`;
      });
    })
    .join('\n');
}
