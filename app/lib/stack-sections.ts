/**
 * What the five stack pages say about openplate, and where each paragraph of it
 * is written down.
 *
 * `/`, `/app`, `/sync` and `/inference` used to describe the software in copy
 * that lived in this repository's `common.json`, which is a second account of an
 * architecture documented in a different repository. The two drifted the way two
 * accounts of anything drift: silently, and in the direction of whichever one
 * nobody re-read. So the pages quote the documentation now, through the pipeline
 * `/docs` already runs on, and this module is the only place a heading from a
 * member repository is written down.
 *
 * ── AN ADDRESS HAS THREE FORMS, AND WHICH ONE FITS IS A QUESTION ABOUT THE READER ──
 * `doc` names one `##` (or `###`) and takes every block under it, up to the next
 * heading at that level or above. `doc-lead` takes every block before a
 * document's first heading, which is the only way to address
 * `openplate-inference/docs/privacy.md`: it is a bold claim and the list that
 * backs it, with no heading anywhere in it. `readme` takes the first paragraphs
 * of a repository's README, and it exists because of what the front page looked
 * like without it.
 *
 * The three stack cards were tried against the flagship documents' leads first.
 * A document's lead is written for whoever opened THAT DOCUMENT, and
 * PROTOCOL.md's reader is implementing a wire protocol: the front page came out
 * saying "Protocol version: 2, Envelope version: 1", then a table of two
 * repository file paths, then "This document is normative; the TypeScript is its
 * transcription". `runtimes.md` added a `docker run` line. All of it true, none
 * of it what openplate is. A README's first paragraph is the one text in these
 * repositories written for somebody who has not arrived yet, so it is the one
 * text fit for the page a first-time reader lands on.
 *
 * `paragraphs` defaults to one and every further paragraph is opted into by
 * hand. Two of these three READMEs punish a greedier rule:
 * openplate-inference's lead runs straight into an ASCII drawing, and
 * openplate's second paragraph opens "There are no accounts. No sign-up, no
 * login, no password", which is a claim a person has to re-check now that the
 * sync server signs people in by email.
 *
 * ── THE HEADING ON THE PAGE IS THE SITE'S, THE WORDS UNDER IT ARE NOT ──
 * `headingKey` is an i18n key and the extracted blocks EXCLUDE the section's own
 * heading. An upstream heading is written for its document and reads as a
 * fragment of somebody else's outline once it is lifted out: one of the sections
 * this site shows on `/sync` is called "9.2 What it does know", which is a
 * numbered step of a protocol specification and not the name of anything on a
 * page a first-time reader lands on. So the frame stays the site's voice, and
 * every sentence inside it is the software's own account of itself.
 */
import type { Block, DocComponent, DocFile } from './docs';

/**
 * The five pages built this way.
 *
 * The list is spelled out rather than read back off the manifest, and it is the manifest's key type,
 * so the two cannot disagree: a page named here with no sections is a type error, and a page with
 * sections and no name here would never be checked by the sync.
 */
export const STACK_PAGES = ['home', 'app', 'core', 'inference', 'deploy'] as const;

/** Not every page: `/docs`, `/privacy` and the imprint are the site talking about itself. */
export type StackPage = (typeof STACK_PAGES)[number];

export type StackManifest = Record<StackPage, SectionAddress[]>;

/**
 * Which words, of the three kinds this site can address.
 *
 * A union and not an object with three optional fields, so that a `readme`
 * address cannot carry a heading and a `doc-lead` address cannot carry a slug it
 * ignores. `kind` is what both readers switch on.
 */
export type SectionSource =
  | { kind: 'doc'; slug: string; heading: string }
  | { kind: 'doc-lead'; slug: string }
  | { kind: 'readme'; paragraphs: number };

export interface SectionAddress {
  /**
   * The name the page's own code asks for this section by.
   *
   * A stable identifier rather than the position in the array, because the
   * routes interleave these sections with hand-written ones, a call to action
   * or a link row, and reading them out in order would tie the route's layout
   * to the order of a list it does not own.
   */
  id: string;
  component: DocComponent;
  from: SectionSource;
  /** The heading the SITE prints above the extracted blocks. */
  headingKey: string;
}

/**
 * Each page's sections, in the order the page shows them.
 *
 * The order is the page's, not a suggestion: `/inference` opens on what the runtime promises and
 * puts the profile table under it, because the table's first column is an environment variable and
 * a reader who has just arrived is owed a claim before a setting.
 */
export const STACK_SECTIONS = {
  home: [
    {
      id: 'whatItIs',
      component: 'app',
      from: { kind: 'doc', slug: 'architecture', heading: 'The client is the product' },
      headingKey: 'pages.home.whatItIs.heading',
    },
    // The three stack cards, each one its repository's own opening sentence about itself.
    {
      id: 'stackApp',
      component: 'app',
      from: { kind: 'readme', paragraphs: 1 },
      headingKey: 'pages.home.stack.app.name',
    },
    {
      id: 'stackCore',
      component: 'core',
      from: { kind: 'readme', paragraphs: 1 },
      headingKey: 'pages.home.stack.core.name',
    },
    {
      id: 'stackInference',
      component: 'inference',
      from: { kind: 'readme', paragraphs: 1 },
      headingKey: 'pages.home.stack.inference.name',
    },
    /**
     * The topology drawing, and the two paragraphs the document introduces it with.
     *
     * `doc-lead` and not a heading, because the drawing IS `architecture.md`'s lead: it sits above
     * the first `##`, where a reader of that document meets it before any of its sections. That is
     * also the argument for putting it on the front page. It is the clearest thing this project has
     * to say, it is already translated by the docs pipeline, and until now it was nine paragraphs
     * deep in a file a first-time reader will never open.
     *
     * The two paragraphs come with it rather than the picture alone, and they are the reason it
     * reads: "follow the two arrows that leave the device" is the instruction that turns a flowchart
     * into an argument. A drawing dropped under a site heading with no sentence is a diagram the
     * reader is asked to interpret unaided.
     */
    {
      id: 'topology',
      component: 'app',
      from: { kind: 'doc-lead', slug: 'architecture' },
      headingKey: 'pages.home.topology.heading',
    },
    {
      id: 'holds',
      component: 'app',
      from: { kind: 'doc', slug: 'architecture', heading: 'Who holds what' },
      headingKey: 'pages.home.holds.heading',
    },
  ],
  app: [
    {
      id: 'stores',
      component: 'app',
      from: { kind: 'doc', slug: 'architecture', heading: 'The client is the product' },
      headingKey: 'pages.app.stores.heading',
    },
    {
      id: 'leaves',
      component: 'app',
      from: { kind: 'doc', slug: 'architecture', heading: 'Inference is compute, and the photo goes to it directly' },
      headingKey: 'pages.app.leaves.heading',
    },
  ],
  core: [
    // PLAIN FIRST, DETAIL AFTER, AND THE DETAIL IS SKIPPABLE. This section was PROTOCOL.md's
    // "9.1 What it cannot know", which opens "The server never receives the DEK, either KEK, the
    // passphrase, or the recovery code". A reader who has just arrived on a component page does
    // not know what a DEK is, and the first paragraph of a page is the wrong place to teach them.
    // The architecture document says why the service exists in its first sentence and puts "It
    // cannot read your entries" in bold before it reaches Argon2id and HKDF, so a reader who stops
    // after two paragraphs has the whole answer.
    {
      id: 'reads',
      component: 'app',
      from: {
        kind: 'doc',
        slug: 'architecture',
        heading: 'Sync is identity, beside the photo path and never inside it',
      },
      headingKey: 'pages.core.reads.heading',
    },
    // 9.2 stays, right underneath, because a concrete list of what the server DOES hold is the
    // honest counterpart to the claim above it, and its opening line introduces no new vocabulary.
    {
      id: 'knows',
      component: 'core',
      from: { kind: 'doc', slug: 'protocol', heading: '9.2 What it does know' },
      headingKey: 'pages.core.knows.heading',
    },
    {
      id: 'tenancy',
      component: 'app',
      from: {
        kind: 'doc',
        slug: 'architecture',
        heading: 'The sync server is tenancy, and it sits in front of the compute on a managed instance',
      },
      headingKey: 'pages.core.tenancy.heading',
    },
  ],
  inference: [
    {
      id: 'privacy',
      component: 'inference',
      from: { kind: 'doc-lead', slug: 'privacy' },
      headingKey: 'pages.inference.privacy.heading',
    },
    {
      id: 'hardware',
      component: 'inference',
      from: { kind: 'doc', slug: 'hardware', heading: 'The profiles' },
      headingKey: 'pages.inference.hardware.heading',
    },
  ],
  /**
   * `/deploy`, which answers a question the front page deliberately does not.
   *
   * ── TWO QUESTIONS, TWO READERS, AND ONLY ONE OF THEM IS ANSWERED BY A TOPOLOGY ──
   * The drawing on the front page is `architecture.md`'s lead and it answers "where does my data
   * go": one picture, the two arrows that leave the device, the claim that the photo never touches
   * the sync server. That is the question a person who is deciding whether to trust the thing
   * asks, and one drawing is the right size for it.
   *
   * "What do I have to run" is a different reader with a different worry, and it does not reduce
   * to that drawing. The answer is five arrangements, from running nothing at all to running every
   * part yourself, and each one is its own small picture of three to seven nodes plus the thing it
   * costs you to operate. Putting them on the front page would replace one legible argument with a
   * ladder nobody arriving for the first time asked to climb, so they get their own page, and the
   * front page keeps saying the one thing it says well.
   *
   * ── THE WORDS ARE `topologies.md`'s, BECAUSE THAT DOCUMENT IS THE ONE KEPT CURRENT ──
   * Every rung here names a compose file in the application repository, and the rungs are revised
   * in the same commit those files are. A second account of them written in this repository would
   * be correct on the day it was typed and quietly wrong the first time a service was added, which
   * is the whole reason this manifest exists. So this page quotes the document and prints only its
   * own headings over it, exactly as the other four do.
   */
  deploy: [
    // The lead first, and it carries the four-row table that summarises the whole ladder. A reader
    // who wants only the shape of the choice can stop after it and has the answer.
    {
      id: 'rungs',
      component: 'app',
      from: { kind: 'doc-lead', slug: 'topologies' },
      headingKey: 'pages.deploy.rungs.heading',
    },
    {
      id: 'rung0',
      component: 'app',
      from: { kind: 'doc', slug: 'topologies', heading: 'Rung 0: run nothing' },
      headingKey: 'pages.deploy.rung0.heading',
    },
    {
      id: 'rung1',
      component: 'app',
      from: { kind: 'doc', slug: 'topologies', heading: 'Rung 1: the app on your own box' },
      headingKey: 'pages.deploy.rung1.heading',
    },
    {
      id: 'rung2',
      component: 'app',
      from: { kind: 'doc', slug: 'topologies', heading: 'Rung 2: add sync' },
      headingKey: 'pages.deploy.rung2.heading',
    },
    // `## Rung 3` carries a `### The sync server and inference are different layers`, and it comes
    // along: `under()` ends a section at the next heading of its level or above, so a deeper one is
    // part of it. That is wanted here. The subsection is what stops a reader concluding that
    // running inference means running sync, which is the confusion this rung invites.
    {
      id: 'rung3',
      component: 'app',
      from: { kind: 'doc', slug: 'topologies', heading: 'Rung 3: add self-hosted inference' },
      headingKey: 'pages.deploy.rung3.heading',
    },
    {
      id: 'rung4',
      component: 'app',
      from: { kind: 'doc', slug: 'topologies', heading: 'Rung 4: everything' },
      headingKey: 'pages.deploy.rung4.heading',
    },
  ],
} satisfies StackManifest;

/**
 * One section of one page, as a route receives it from its loader: the site's
 * heading key, and the upstream blocks that go under it.
 *
 * It lives HERE and not beside `pageSections` in the `.server` module, because
 * the route components read it. A type import from a `.server` file is erased by
 * the compiler and survives `pnpm typecheck` and `pnpm dev` alike, and then
 * fails the production client build alone.
 */
export interface PageSection {
  id: string;
  headingKey: string;
  blocks: Block[];
}

/**
 * One section by name, for a route that lays its own page out.
 *
 * The routes interleave these with hand-written sections, a call to action or a
 * link row, so they ask for one at a time rather than rendering the list in
 * order. A miss is a bug in the route rather than anything a reader can cause,
 * so it throws instead of rendering an empty heading.
 */
export function section(sections: PageSection[], id: string): PageSection {
  const found = sections.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`stack-sections: no section called ${id} on this page.`);
  return found;
}

/**
 * Whatever holds the words an address might name.
 *
 * Two readers resolve this manifest and they hold the documents differently. `sync-docs.ts` has
 * just parsed them and has them in a list; the route loader imports a generated registry. Passing
 * the two lookups in keeps one copy of the rules and lets each caller keep its own shape.
 */
export interface DocumentSource {
  /** The page a component publishes under a slug, or null when it publishes none. */
  page: (component: DocComponent, slug: string) => DocFile | null;
  /** The blocks between a repository README's title and its first `##`. */
  readme: (component: DocComponent) => Block[];
}

/**
 * The blocks an address names, or `null` when the repository no longer holds them.
 *
 * `null` and not an empty list, and the difference matters at both call sites:
 * `sync-docs.ts` turns it into a failed sync naming the file and the heading,
 * and the route loader turns it into a thrown error rather than a page with a
 * heading and nothing under it. A section that has become empty upstream is the
 * same problem as one that has been renamed: the page is telling the reader
 * about something that is no longer there.
 */
export function sectionBlocks(address: SectionAddress, source: DocumentSource): Block[] | null {
  if (address.from.kind === 'readme') {
    return firstParagraphs(source.readme(address.component), address.from.paragraphs);
  }
  const doc = source.page(address.component, address.from.slug);
  if (doc === null) return null;
  const blocks = address.from.kind === 'doc-lead' ? lead(doc.blocks) : under(doc.blocks, address.from.heading);
  return blocks === null || blocks.length === 0 ? null : blocks;
}

/**
 * The first `count` paragraphs of a README lead, or `null` when it holds fewer.
 *
 * PARAGRAPHS, not blocks, and the difference is the reason this counts at all. A README lead is
 * where a repository keeps its badge row, its hero image and, in openplate-inference's case, an
 * ASCII drawing of the request path. None of those say what the software is, and none of them
 * belong on a card, so the count walks past them rather than stopping at them.
 */
function firstParagraphs(blocks: Block[], count: number): Block[] | null {
  const paragraphs = blocks.filter((block) => block.kind === 'paragraph');
  return paragraphs.length < count ? null : paragraphs.slice(0, count);
}

/** Every block before the document's first heading. */
function lead(blocks: Block[]): Block[] {
  const first = blocks.findIndex((block) => block.kind === 'heading');
  return first === -1 ? blocks : blocks.slice(0, first);
}

/**
 * The blocks under one heading, up to the next heading at its level or above.
 *
 * A DEEPER heading does not end the section, it is part of it. `## The sync
 * server is tenancy` carries a `### History` about the service that used to do
 * its job, and a reader of that section on this site needs that paragraph for
 * the same reason a reader of the document does.
 */
function under(blocks: Block[], heading: string): Block[] | null {
  const at = blocks.findIndex((block) => block.kind === 'heading' && block.text === heading);
  if (at === -1) return null;
  const start = blocks[at];
  if (start?.kind !== 'heading') return null;
  const rest = blocks.slice(at + 1);
  const end = rest.findIndex((block) => block.kind === 'heading' && block.level <= start.level);
  return end === -1 ? rest : rest.slice(0, end);
}
