/**
 * The frame every page renders inside: a wordmark and nav, the page itself, a
 * footer with the legal pages and the source, and a language switcher.
 *
 * The switcher is a pair of plain links, not a control: every page exists as a
 * real file in both languages, so switching is a navigation and needs no
 * script. It is built by canonicalizing the current path and localizing it
 * again, which keeps a reader on the same page rather than dropping them on a
 * language root.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { ExternalLink, SiteLink } from './site-link';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  canonicalizePath,
  localizePath,
  type LanguageCode,
} from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';
import { REPOSITORIES } from '#app/site';

const NAV_ITEMS = [
  { to: '/app', labelKey: 'site.nav.app' },
  { to: '/sync', labelKey: 'site.nav.sync' },
  { to: '/inference', labelKey: 'site.nav.inference' },
  { to: '/docs', labelKey: 'site.nav.docs' },
] as const;

function LanguageSwitcher({ current }: { current: LanguageCode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const canonical = canonicalizePath(pathname);

  return (
    <nav aria-label={t('site.language.label')} className="flex items-center gap-3 text-sm">
      {SUPPORTED_LANGUAGES.map((language) =>
        language === current ?
          <span key={language} aria-current="true" className="text-foreground">
            {LANGUAGE_LABELS[language]}
          </span>
        : <Link key={language} to={localizePath(canonical, language)} className="text-muted-foreground hover:text-foreground">
            {LANGUAGE_LABELS[language]}
          </Link>,
      )}
    </nav>
  );
}

export function SiteLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-3 focus:rounded focus:bg-card focus:p-2">
        {t('site.skipToContent')}
      </a>

      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline gap-x-6 gap-y-2 px-5 py-5">
          <SiteLink to="/" className="font-display text-xl font-semibold tracking-tight text-primary">
            {t('site.name')}
          </SiteLink>
          <nav className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
            {NAV_ITEMS.map((item) => (
              <SiteLink key={item.to} to={item.to} className="text-muted-foreground hover:text-foreground">
                {t(item.labelKey)}
              </SiteLink>
            ))}
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-3xl grow px-5 py-12">
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline justify-between gap-x-6 gap-y-3 px-5 py-8 text-sm text-muted-foreground">
          <nav className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <SiteLink to="/imprint" className="hover:text-foreground">
              {t('pages.imprint.title')}
            </SiteLink>
            <SiteLink to="/privacy" className="hover:text-foreground">
              {t('pages.privacy.title')}
            </SiteLink>
            <ExternalLink href={REPOSITORIES.app} className="hover:text-foreground">
              {t('site.footer.sourceCode')}
            </ExternalLink>
          </nav>
          <LanguageSwitcher current={language} />
        </div>
      </footer>
    </div>
  );
}
