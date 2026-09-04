/**
 * The paths the prerenderer cannot work out for itself.
 *
 * `getStaticPaths()` in `react-router.config.ts` enumerates every route whose
 * path has no parameters. Two routes do have parameters, `/docs/:component/:slug`
 * and `/releases/:component`, so their URLs have to be named here or the build
 * emits no file for them.
 *
 * TEMPORARY SHAPE. The real list is one path per documentation page and one per
 * component's release notes, derived from the generated modules the docs sync
 * commits under `src/generated/`. That sync does not exist yet (M193 spec 02),
 * so this returns one sample path per dynamic route: enough for the build to
 * prove the mechanism works, and it fails loudly if it ever stops working,
 * because the checked-in path would stop producing a file.
 */
import { PREFIXED_LANGUAGES, localizePath } from './i18n/language';

/** One sample per dynamic route, in the canonical English-rooted form. */
const SAMPLE_PATHS = ['/docs/app/getting-started', '/releases/app'];

/** Every dynamic path, in every language the site is built in. */
export function prerenderDynamicPaths(): string[] {
  const paths: string[] = [];

  for (const path of SAMPLE_PATHS) {
    paths.push(path);
    for (const language of PREFIXED_LANGUAGES) {
      paths.push(localizePath(path, language));
    }
  }

  return paths;
}
