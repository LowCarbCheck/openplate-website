/**
 * The documentation nav as data: one group per component, in `DOC_COMPONENTS`
 * order, each its README rows and then its release notes.
 *
 * Pure, so the sidebar and the phone's sheet draw the same answer and a test
 * can pin it. TITLES ONLY. The rows used to carry the README's one-line blurb
 * for the component being read, and a rail of two-line rows was louder than the
 * article beside it and longer than any screen. The blurbs are on the docs
 * start page, where a reader choosing a guide reads them.
 */
import { docRoute, releasesRoute } from './doc-routes';
import { DOC_COMPONENTS, type DocComponent, type DocsIndex } from './docs';

/** Where the reader is: a doc page or a component's release notes. */
export type DocsPlace =
  { kind: 'doc'; component: DocComponent; slug: string } | { kind: 'releases'; component: DocComponent };

export type DocsNavRow =
  { kind: 'doc'; to: string; title: string; isCurrent: boolean } | { kind: 'releases'; to: string; isCurrent: boolean };

export interface DocsNavGroup {
  component: DocComponent;
  /** True for the component being read. */
  isCurrent: boolean;
  rows: DocsNavRow[];
}

/** Every component's rows, marking the one `place` names. `place` is absent on the index. */
export function docsNavGroups({ index, place }: { index: DocsIndex; place?: DocsPlace }): DocsNavGroup[] {
  return DOC_COMPONENTS.map((component) => {
    const isCurrent = place?.component === component;
    const docRows = index[component].entries.map((entry): DocsNavRow => ({
      kind: 'doc',
      to: docRoute(component, entry.slug),
      title: entry.title,
      isCurrent: isCurrent && place?.kind === 'doc' && place.slug === entry.slug,
    }));
    const releases: DocsNavRow = {
      kind: 'releases',
      to: releasesRoute(component),
      isCurrent: isCurrent && place?.kind === 'releases',
    };
    return { component, isCurrent, rows: [...docRows, releases] };
  });
}
