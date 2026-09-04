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
import { languageFromPathname } from '#app/i18n/language';
import { coverage, translateDoc, translateEntries, translationsFor } from '#app/lib/docs-i18n.server';
import { findComponent, findDoc, slugify } from '#app/lib/docs';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import { DOCS } from '../../src/generated/docs-registry';
import type { Route } from './+types/docs.$component.$slug';

/**
 * THE TRANSLATION HAPPENS HERE, IN THE LOADER, AND NOT IN THE COMPONENT.
 *
 * The German page is the English block tree rebuilt against the memory in
 * `src/generated/docs-i18n/de.json` — see `app/lib/docs-i18n.server.ts`. Doing
 * it in the loader is what keeps the memory and the hashing out of the browser
 * bundle, and the site is prerendered, so this runs at build time and the reader
 * is sent finished German.
 *
 * The file list and the previous/next links are translated on the same line, out
 * of the same memory, because a German page with an English sidebar is a page
 * that looks broken rather than partly translated.
 */
export function loader({ params, request }: Route.LoaderArgs) {
  const component = findComponent(params.component);
  // A URL segment is a string a reader can type. Both halves are checked here,
  // at the boundary, so everything below this line has a component and a page.
  if (component === null) throw new Response('Not Found', { status: 404 });
  const doc = findDoc(DOCS, component, params.slug);
  if (doc === null) throw new Response('Not Found', { status: 404 });

  const language = languageFromPathname(new URL(request.url).pathname);
  const memory = translationsFor(language);
  return {
    doc: translateDoc(doc, memory),
    docs: translateEntries(DOCS_INDEX[component], memory),
    // THE ANCHOR STAYS ENGLISH, like every heading id on the page. A doc that
    // links to another one by its title lands on the h1, and a translated id
    // would send that link nowhere on the German page alone.
    titleId: slugify(doc.title),
    translated: coverage(doc, memory) > 0,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  // The document's own title, which is quoted rather than written and is the
  // one string on this page that is the same in both languages until spec 03.
  return [{ title: loaderData === undefined ? 'openplate' : `${loaderData.doc.title} — openplate` }];
}

export default function DocsPageRoute() {
  const { doc, docs, titleId, translated } = useLoaderData<typeof loader>();

  return (
    <SiteLayout wide>
      <DocPage doc={doc} docs={docs} titleId={titleId} translated={translated} />
    </SiteLayout>
  );
}
