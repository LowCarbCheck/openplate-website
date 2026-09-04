/**
 * Matomo, cookie free.
 *
 * `disableCookies` is pushed before the tracker loads, so no cookie is ever
 * written and the site needs no consent banner. That is how the other
 * SPRQVNTRS sites run Matomo, and it is what the privacy page says.
 *
 * The site id is read from `MATOMO_SITE_ID` at BUILD time, in the root loader,
 * because every page here is prerendered and there is no request to read an
 * environment variable from later. With the variable unset, nothing is
 * rendered at all, which is what a local build and a development run want.
 *
 * The pages hydrate into a client router, so a second page view is a client
 * navigation and Matomo would never hear about it. `useMatomoPageViews` is the
 * subscription that tells it: a genuine synchronization with an external
 * system, which is what an effect is for.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

const MATOMO_BASE_URL = 'https://matomo.sprqvntrs.com/';

declare global {
  interface Window {
    _paq?: Array<Array<string | number>>;
  }
}

function trackerScript(siteId: string): string {
  return [
    "var _paq = (window._paq = window._paq || []);",
    "_paq.push(['disableCookies']);",
    "_paq.push(['trackPageView']);",
    "_paq.push(['enableLinkTracking']);",
    '(function () {',
    `  var u = '${MATOMO_BASE_URL}';`,
    "  _paq.push(['setTrackerUrl', u + 'matomo.php']);",
    `  _paq.push(['setSiteId', '${siteId}']);`,
    "  var d = document, g = d.createElement('script'), s = d.getElementsByTagName('script')[0];",
    "  g.async = true; g.src = u + 'matomo.js'; s.parentNode.insertBefore(g, s);",
    '})();',
  ].join('\n');
}

export function MatomoTracker({ siteId }: { siteId: string }) {
  // Safety: the whole point of this element is to inject a script, and the id
  // is a build-time environment variable, not anything a visitor can reach.
  return <script dangerouslySetInnerHTML={{ __html: trackerScript(siteId) }} />;
}

/** Report every client-side navigation after the first, which the tracker snippet already counted. */
export function useMatomoPageViews(isEnabled: boolean) {
  const { pathname, search } = useLocation();
  const hasReportedFirstView = useRef(false);

  useEffect(() => {
    if (!isEnabled) return;

    if (!hasReportedFirstView.current) {
      hasReportedFirstView.current = true;
      return;
    }

    const queue = globalThis.window._paq;
    if (!queue) return;

    queue.push(['setCustomUrl', `${globalThis.location.origin}${pathname}${search}`]);
    queue.push(['setDocumentTitle', globalThis.document.title]);
    queue.push(['trackPageView']);
  }, [isEnabled, pathname, search]);
}
