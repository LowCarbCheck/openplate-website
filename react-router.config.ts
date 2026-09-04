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
} satisfies Config;
