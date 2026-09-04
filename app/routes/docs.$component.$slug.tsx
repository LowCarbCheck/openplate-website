/**
 * One documentation page of one component.
 *
 * THE PAGE COMES FROM A LOADER AND NOT FROM A TOP-LEVEL IMPORT IN THE COMPONENT,
 * and the reason is the client bundle. React Router strips a loader from the
 * browser build, so `docs-registry.ts` — every one of the fifteen pages, 700 KB
 * of parsed block trees — is a server-and-build-time module. A reader who opens
 * one page is sent that page's data and none of the other fourteen. The nav
 * index below is imported normally, because it is a few kilobytes and every
 * page draws it.
 */
import { useLoaderData } from 'react-router';

import { DocPage } from '#app/components/docs/doc-page';
import { SiteLayout } from '#app/components/site-layout';
import { findComponent, findDoc } from '#app/lib/docs';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import { DOCS } from '../../src/generated/docs-registry';
import type { Route } from './+types/docs.$component.$slug';

export function loader({ params }: Route.LoaderArgs) {
  const component = findComponent(params.component);
  // A URL segment is a string a reader can type. Both halves are checked here,
  // at the boundary, so everything below this line has a component and a page.
  if (component === null) throw new Response('Not Found', { status: 404 });
  const doc = findDoc(DOCS, component, params.slug);
  if (doc === null) throw new Response('Not Found', { status: 404 });
  return { doc };
}

export function meta({ loaderData }: Route.MetaArgs) {
  // The document's own title, which is quoted rather than written and is the
  // one string on this page that is the same in both languages until spec 03.
  return [{ title: loaderData === undefined ? 'openplate' : `${loaderData.doc.title} — openplate` }];
}

export default function DocsPageRoute() {
  const { doc } = useLoaderData<typeof loader>();

  return (
    <SiteLayout wide>
      <DocPage doc={doc} docs={DOCS_INDEX[doc.component]} />
    </SiteLayout>
  );
}
