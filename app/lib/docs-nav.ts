/**
 * The documentation nav as data: one group per component, in `DOC_COMPONENTS`
 * order, each its README rows and then its release notes.
 *
 * Pure, so the sidebar and the phone's sheet draw the same answer and a test
 * can pin it. Only the group being read carries blurbs: three components of
 * two-line rows is a rail longer than any screen.
 */
import { docRoute, releasesRoute } from './doc-routes';
import { DOC_COMPONENTS, type DocComponent, type DocsIndex, type Inline } from './docs';

/** Where the reader is: a doc page or a component's release notes. */
export type DocsPlace = { kind: 'doc'; component: DocComponent; slug: string } | { kind: 'releases'; component: DocComponent };

export type DocsNavRow =
  | { kind: 'doc'; to: string; title: string; blurb: Inline[] | null; isCurrent: boolean }
  | { kind: 'releases'; to: string; isCurrent: boolean };

export interface DocsNavGroup {
  component: DocComponent;
  /** True for the component being read; its rows carry blurbs. */
  isCurrent: boolean;
  rows: DocsNavRow[];
}

/** Every component's rows, marking the one `place` names. `place` is absent on the index. */
export function docsNavGroups({ index, place }: { index: DocsIndex; place?: DocsPlace }): DocsNavGroup[] {
  return DOC_COMPONENTS.map((component) => {
    const isCurrent = place?.component === component;
    const docRows = index[component].entries.map(
      (entry): DocsNavRow => ({
        kind: 'doc',
        to: docRoute(component, entry.slug),
        title: entry.title,
        blurb: isCurrent ? entry.blurb : null,
        isCurrent: isCurrent && place?.kind === 'doc' && place.slug === entry.slug,
      }),
    );
    const releases: DocsNavRow = {
      kind: 'releases',
      to: releasesRoute(component),
      isCurrent: isCurrent && place?.kind === 'releases',
    };
    return { component, isCurrent, rows: [...docRows, releases] };
  });
}
