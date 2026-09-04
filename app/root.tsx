import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';

import type { Route } from './+types/root';
import { I18nProvider } from '#app/i18n/I18nProvider';
import { useLanguage } from '#app/i18n/use-language';
import stylesheet from './app.css?url';

export const links: Route.LinksFunction = () => [{ rel: 'stylesheet', href: stylesheet }];

export function Layout({ children }: { children: ReactNode }) {
  // Read from the URL, not from a loader: this document is written to disk at
  // build time, so there is no request whose headers could carry a preference.
  const language = useLanguage();

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
      </body>
    </html>
  );
}

export default function App() {
  const language = useLanguage();

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
