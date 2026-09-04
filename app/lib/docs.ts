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
  | { kind: 'image'; src: string; alt: string };

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
