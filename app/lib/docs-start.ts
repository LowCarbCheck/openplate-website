/**
 * The documentation start page as data: a "Start here" row, then one card per component.
 *
 * Every title, blurb, version and date comes from the docs index, which is the READMEs' own tables,
 * so a guide renamed upstream arrives renamed here on the next sync. The one thing written by hand
 * is WHICH guides are featured, in the two constants below. Pure, so a test can hold every named
 * slug to the index: a slug that stops existing upstream fails the unit tier and the prerender, and
 * never renders a card with a gap in it.
 */
import { docRoute, releasesRoute } from './doc-routes';
import { DOC_COMPONENTS, type DocComponent, type DocsIndex, type Inline } from './docs';

/** One guide, addressed the way the route addresses it. */
export interface GuideRef {
  component: DocComponent;
  slug: string;
}

/**
 * The two guides a reader who wants to run openplate opens first: how to install it, and which of
 * the ways to deploy it fits them. Both are the app's, because the app's guides are where a
 * self-hosted install starts.
 */
export const START_HERE: readonly GuideRef[] = [
  { component: 'app', slug: 'self-hosting' },
  { component: 'app', slug: 'topologies' },
];

/**
 * Three or four guides per component, the ones a reader of that component reads first. The rest
 * are one click away under "All guides". The app's two start-here guides are not repeated here.
 */
export const MAIN_GUIDES = {
  app: ['architecture', 'configuration', 'sync', 'family-setup'],
  core: ['protocol'],
  inference: ['hardware', 'runtimes', 'configuration', 'troubleshooting'],
} as const satisfies Record<DocComponent, readonly string[]>;

export interface StartLink {
  to: string;
  title: string;
  blurb: Inline[];
}

export interface ComponentCard {
  component: DocComponent;
  /** The release tag the guides were read at. */
  version: string;
  /** The date that commit was made, `YYYY-MM-DD`. */
  date: string;
  featured: StartLink[];
  /** Every guide of the component, in the README's order. */
  all: StartLink[];
  releasesTo: string;
}

export interface DocsStartPage {
  startHere: StartLink[];
  cards: ComponentCard[];
}

function linkTo({ index, guide }: { index: DocsIndex; guide: GuideRef }): StartLink {
  const entry = index[guide.component].entries.find((candidate) => candidate.slug === guide.slug);
  if (entry === undefined) {
    throw new Error(`docs-start names ${guide.component}/${guide.slug}, which the docs index does not have`);
  }
  return { to: docRoute(guide.component, entry.slug), title: entry.title, blurb: entry.blurb };
}

export function docsStartPage(index: DocsIndex): DocsStartPage {
  return {
    startHere: START_HERE.map((guide) => linkTo({ index, guide })),
    cards: DOC_COMPONENTS.map((component) => {
      const docs = index[component];
      return {
        component,
        version: docs.source.ref,
        date: docs.source.committedAt,
        featured: MAIN_GUIDES[component].map((slug) => linkTo({ index, guide: { component, slug } })),
        all: docs.entries.map((entry) => linkTo({ index, guide: { component, slug: entry.slug } })),
        releasesTo: releasesRoute(component),
      };
    }),
  };
}
