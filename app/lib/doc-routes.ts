/**
 * Where a documentation page is published.
 *
 * KEPT IN STEP WITH `scripts/sync-docs.ts`, which resolves the docs'
 * cross-references against the same rule — a link from one doc to another has
 * to land on the route that actually publishes it. Both sides import this
 * function rather than spelling the path twice.
 *
 * There is no exception here, unlike collie's `/install`. Nothing on this site
 * links a documentation page from anywhere but the documentation, so no page
 * has earned a shorter URL and none is published under two names.
 */
import type { DocComponent } from './docs';

export function docRoute(component: DocComponent, slug: string): string {
  return `/docs/${component}/${slug}`;
}

export function releasesRoute(component: DocComponent): string {
  return `/releases/${component}`;
}
