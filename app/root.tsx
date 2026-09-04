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

import type { Route } from './+types/root';
import { I18nProvider } from '#app/i18n/I18nProvider';
import { MatomoTracker, useMatomoPageViews } from '#app/matomo';
import { useLanguage } from '#app/i18n/use-language';
import stylesheet from './app.css?url';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: stylesheet }];

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
