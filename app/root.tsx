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
import { MatomoTracker, useMatomoPageViews } from '#app/matomo';
import { useLanguage } from '#app/i18n/use-language';
import stylesheet from './app.css?url';

/**
 * The stylesheet, and openplate's own mark in every size a browser asks for.
 *
 * The files come from the application repository by `pnpm sync:icons`, at a pinned ref, so the site
 * cannot drift from the mark on the thing it describes. Declaring the `.ico` rather than leaning on
 * the `/favicon.ico` convention is what lets the two PNGs be offered beside it: a browser picks the
 * size it wants from the list, and only the list.
 */
export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: stylesheet },
  { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
  { rel: 'icon', type: 'image/png', href: '/icons/icon-192.png', sizes: '192x192' },
  { rel: 'icon', type: 'image/png', href: '/icons/icon-512.png', sizes: '512x512' },
  { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png', sizes: '180x180' },
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
          The colour a browser paints its own chrome with, one per appearance, taken from the two
          `:root` blocks in app.css by the plugin in vite.config.ts rather than written here again.

          DELIBERATELY NO WEB MANIFEST BESIDE THEM. beta.openplate.de is the installable application
          and it ships its own. A second installable origin, serving a page that describes the app
          and cannot log a meal, is worse than none: a reader who installs it gets a home screen
          icon that looks like openplate, opens on marketing copy, and has nowhere to go from there.
          Icons and a theme colour give a tab and a bookmark the right face, which is the whole of
          what this site needs.
        */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={THEME_COLOR.light} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={THEME_COLOR.dark} />
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
