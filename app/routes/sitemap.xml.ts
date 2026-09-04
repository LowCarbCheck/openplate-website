/**
 * `/sitemap.xml`, a resource route with no component.
 *
 * The loader runs during the prerender pass, so the response body is written
 * to `build/client/sitemap.xml` and served as a plain file. Nothing here runs
 * at request time.
 */
import { buildSitemapXml } from '#app/sitemap';

export function loader() {
  return new Response(buildSitemapXml(), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
}
