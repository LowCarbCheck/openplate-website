/**
 * The paths the prerenderer cannot work out for itself.
 *
 * `getStaticPaths()` in `react-router.config.ts` enumerates every route whose
 * path has no parameters. Two routes do have parameters,
 * `/docs/:component/:slug` and `/releases/:component`, so their URLs have to be
 * named here or the build emits no file for them.
 *
 * THEY ARE NOT NAMED BY HAND. Every path comes from `src/generated/docs-index.ts`,
 * which `pnpm sync:docs` writes out of the three repositories' own README
 * tables. A guide added upstream is prerendered on the next sync, and a guide
 * removed upstream stops being written, without an edit here — the same rule the
 * nav and the sidebar already follow.
 *
 * Every path is emitted once per language. German renders the English blocks
 * until spec 03 translates them, and it says so on the page; a document that
 * exists in one language and 404s in the other would be a worse answer than a
 * translated-later notice.
 */
import { PREFIXED_LANGUAGES, localizePath } from './i18n/language';
import { docRoute, releasesRoute } from './lib/doc-routes';
import { DOC_COMPONENTS } from './lib/docs';
import { DOCS_INDEX } from '../src/generated/docs-index';

/** Every generated page, in the canonical English-rooted form. */
export function docPaths(): string[] {
  const paths: string[] = [];

  for (const component of DOC_COMPONENTS) {
    for (const entry of DOCS_INDEX[component].entries) paths.push(docRoute(component, entry.slug));
    paths.push(releasesRoute(component));
  }

  return paths;
}

/** Every dynamic path, in every language the site is built in. */
export function prerenderDynamicPaths(): string[] {
  const paths: string[] = [];

  for (const path of docPaths()) {
    paths.push(path);
    for (const language of PREFIXED_LANGUAGES) {
      paths.push(localizePath(path, language));
    }
  }

  return paths;
}
