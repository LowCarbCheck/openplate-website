import type { Config } from '@react-router/dev/config';

import { prerenderDynamicPaths } from './app/prerender';

export default {
  ssr: true,

  /**
   * Prerender everything. The output is a static file per URL under
   * `build/client/`, so the deployed site needs no database, no session and no
   * work at request time.
   *
   * This is the function form rather than a bare `true` for one reason:
   * `true` covers only the routes whose path has no parameters, and this site
   * has two that do. `getStaticPaths()` returns exactly the set `true` would
   * have used, so the two lines below are "everything `true` covers, plus the
   * dynamic pages" (see `app/prerender.ts`).
   */
  prerender({ getStaticPaths }) {
    return [...getStaticPaths(), ...prerenderDynamicPaths()];
  },

  /**
   * Every route is in the first page's manifest, so a link click never asks the server for one.
   *
   * The default is `lazy`: the browser discovers the routes it does not know yet by fetching
   * `/__manifest` on the first click. Only the framework's own server answers that URL. This site
   * is a folder of static files behind nginx, which answers it with 404, so every internal link
   * click ended on the router's "Error" page, on openplate.de as well as on a local static server.
   * `initial` ships the whole route manifest with the first document instead. The site has under a
   * hundred routes, so the manifest is a few kilobytes compressed, and a static host then needs
   * nothing but the files.
   */
  routeDiscovery: { mode: 'initial' },
} satisfies Config;
