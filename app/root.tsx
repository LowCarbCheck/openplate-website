import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';

import { THEME_COLOR } from 'virtual:theme-colors';

import type { Route } from './+types/root';
import { I18nProvider } from '#app/i18n/I18nProvider';
import { THEME_SCRIPT } from '#app/lib/theme';
import { MatomoTracker, useMatomoPageViews } from '#app/matomo';
import { useLanguage } from '#app/i18n/use-language';
import stylesheet from './app.css?url';

/**
 * The stylesheet, and openplate's own mark in every size a browser asks for.
 *
 * The files come from `openplate-brand` by `pnpm sync:icons`, at a pinned ref, and every one is
 * checked against that repository's `assets/MANIFEST.json` by sha256. The brand repository is the
 * one origin of the mark: the app and this site are equal consumers of it, and neither cuts an
 * icon of its own. Declaring the `.ico` rather than leaning on the `/favicon.ico` convention is
 * what lets the two PNGs be offered beside it: a browser picks the size it wants from the list,
 * and only the list.
 */
export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  // NO `rel="preload"` FOR THE TWO WOFF2 FILES, and it was tried. Measured on this
  // build with `agent-browser vitals`, four runs each: 36 to 40 ms first paint
  // without the preloads, 32 to 60 ms with them. That is noise, not a gain, because
  // over a loopback the stylesheet that names the fonts arrives in under a
  // millisecond and the preload wins nothing it was not already going to get. Two
  // more requests the browser must make before it knows whether it needs them is not
  // a cost to carry for a number nobody can show. Measure it again over a real
  // network on the live host before adding it, and put the numbers here.
  // Cache-busted (?v=2): public/favicon.ico was replaced in place this morning,
  // an unrelated red and black molecule swapped for openplate's own mark. The
  // href never changes name, so a returning visitor's cached copy would
  // otherwise never update. The version marker forces the refetch.
  { rel: 'icon', href: '/favicon.ico?v=2', sizes: '48x48' },
  { rel: 'icon', type: 'image/png', href: '/icons/icon-192.png?v=2', sizes: '192x192' },
  { rel: 'icon', type: 'image/png', href: '/icons/icon-512.png?v=2', sizes: '512x512' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png?v=2', sizes: '180x180' },
];

/**
 * Read at BUILD time: the prerender pass calls this once per URL and bakes the
 * result into the static document. There is no request to read anything from
 * later, so an environment variable is the only configuration a page can have.
 */
export function loader() {
  return { matomoSiteId: process.env.MATOMO_SITE_ID ?? null };
}

/** Null in a build that had no `MATOMO_SITE_ID`, which is every local build. */
function useMatomoSiteId(): string | null {
  const data = useRouteLoaderData<typeof loader>('root');
  return data?.matomoSiteId ?? null;
}

export function Layout({ children }: { children: ReactNode }) {
  // Read from the URL, not from a loader: this document is written to disk at
  // build time, so there is no request whose headers could carry a preference.
  const language = useLanguage();
  const matomoSiteId = useMatomoSiteId();

  return (
    <html lang={language}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/*
          THE APPEARANCE, CHOSEN BEFORE ANYTHING IS PAINTED. This document is a file on disk: there
          is no request, so no cookie and no header could have told the build what this reader
          prefers. The script writes `data-theme` onto <html> synchronously, ahead of the body, and
          `app/app.css` keys the tokens to it. Anything later than this is a white page that turns
          dark in front of somebody. See `app/lib/theme.ts`.
        */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        {/*
          The colour a browser paints its own chrome with, taken from the `:root` blocks in app.css
          by the plugin in vite.config.ts rather than written here again.

          THE LIVE ONE IS MADE BY THE SCRIPT ABOVE, and this is the fallback for a reader who has no
          script. A browser takes the FIRST theme-color tag whose `media` matches, so a media-scoped
          pair cannot express an override: somebody on a dark system who chose light would keep dark
          browser chrome. With no script there is no override to express, so the pair is exactly
          right here and wrong anywhere else.

          DELIBERATELY NO WEB MANIFEST BESIDE THEM. beta.openplate.de is the installable application
          and it ships its own. A second installable origin, serving a page that describes the app
          and cannot log a meal, is worse than none: a reader who installs it gets a home screen
          icon that looks like openplate, opens on marketing copy, and has nowhere to go from there.
          Icons and a theme colour give a tab and a bookmark the right face, which is the whole of
          what this site needs.
        */}
        <noscript
          dangerouslySetInnerHTML={{
            __html:
              `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${THEME_COLOR.light}">` +
              `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${THEME_COLOR.dark}">`,
          }}
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
        {matomoSiteId ? <MatomoTracker siteId={matomoSiteId} /> : null}
      </body>
    </html>
  );
}

export default function App() {
  const language = useLanguage();
  const matomoSiteId = useMatomoSiteId();

  useMatomoPageViews(matomoSiteId !== null);

  return (
    <I18nProvider language={language}>
      <Outlet />
    </I18nProvider>
  );
}

function ErrorMessage({ status, statusText }: { status: number | null; statusText: string }) {
  const { t } = useTranslation();

  if (status === 404) {
    return <h1>{t('pages.notFound.title')}</h1>;
  }

  return <h1>{statusText}</h1>;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const language = useLanguage();
  const isResponse = isRouteErrorResponse(error);

  return (
    <I18nProvider language={language}>
      <main className="container mx-auto p-4 pt-16">
        <ErrorMessage
          status={isResponse ? error.status : null}
          statusText={isResponse ? error.statusText : 'Error'}
        />
      </main>
    </I18nProvider>
  );
}
