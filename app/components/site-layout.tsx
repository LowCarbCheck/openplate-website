/**
 * The frame every page renders inside: a wordmark and nav, the page itself, a
 * footer with the legal pages and the source, and a language switcher.
 *
 * The switcher is a pair of plain links, not a control: every page exists as a
 * real file in both languages, so switching is a navigation and needs no
 * script. It is built by canonicalizing the current path and localizing it
 * again, which keeps a reader on the same page rather than dropping them on a
 * language root.
 *
 * It names German first, and it does that by iterating SUPPORTED_LANGUAGES in
 * declared order rather than by sorting or by a list of its own. This is a
 * German site: German is the first language of the switcher for the same reason
 * it owns the unprefixed URLs. The order therefore lives in one place,
 * `app/i18n/language.ts`, and a language added there arrives here in the
 * position it was written in.
 */
import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { ExternalLink, SiteLink } from './site-link';
import { ThemeToggle } from './theme-toggle';
import {
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
  canonicalizePath,
  localizePath,
  type LanguageCode,
} from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';
import { syncPicturesToTheme } from '#app/lib/theme';
import { REPOSITORIES } from '#app/site';

const NAV_ITEMS = [
  { to: '/app', labelKey: 'site.nav.app' },
  { to: '/sync', labelKey: 'site.nav.sync' },
  { to: '/inference', labelKey: 'site.nav.inference' },
  { to: '/deploy', labelKey: 'site.nav.deploy' },
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
        : <Link
            key={language}
            to={localizePath(canonical, language)}
            className="text-muted-foreground hover:text-foreground"
          >
            {LANGUAGE_LABELS[language]}
          </Link>,
      )}
    </nav>
  );
}

/**
 * How wide the page under this frame is allowed to be.
 *
 * ── THREE, BECAUSE TWO STOPPED BEING ENOUGH ──
 * `reading` is one column of prose at 48rem, and it is right for a page that is
 * nothing but prose: the imprint and the privacy notice. It was also what the
 * marketing pages got, and there it was wrong, because those pages are not one
 * column: a grid of four screenshots and a row of three cards were being folded
 * into a measure chosen for sentences, and the cards came out visibly cramped.
 * `marketing` gives them 72rem. `full` is the documentation, unchanged, which
 * carries a file list on one side and a contents rail on the other and fits
 * neither beside the text at 48rem.
 *
 * A WIDER PAGE IS NOT A WIDER PARAGRAPH. Running text keeps its own measure
 * inside a `marketing` page: `Section` in `page.tsx` caps the paragraphs it
 * holds, and `DocBlocks` caps the quoted ones. The extra width is for the
 * things that were never sentences.
 */
const WIDTH = {
  reading: 'max-w-3xl',
  marketing: 'max-w-6xl',
  full: 'max-w-[88rem]',
} as const;

/**
 * The gutter, which is the page's own and not the header's.
 *
 * `docs-shell.tsx` sets `px-6` on the documentation grid and every other page
 * here sets `px-5`. The header matches whichever one is under it, because a
 * wordmark one pixel off the left edge of the file list below it is the same
 * defect as a wordmark in the middle of the window, only smaller.
 */
const PADDING = {
  reading: 'px-5',
  marketing: 'px-5',
  full: 'px-6',
} as const;

export type PageWidth = keyof typeof WIDTH;

export function SiteLayout({
  children,
  width = 'reading',
}: {
  children: ReactNode;
  /**
   * THE HEADER FOLLOWS THE PAGE. It used to keep the narrow measure on every
   * page, which put the wordmark and the nav in the middle of a documentation
   * page whose own content starts at the left edge of an 88rem grid, so the
   * chrome looked unrelated to the page under it. Matching the measure lines
   * the wordmark up with the file list beneath it. The footer stays on the
   * reading measure: it is a short row of links and an end-cap, not something
   * a column has to line up with.
   */
  width?: PageWidth;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { pathname } = useLocation();

  /*
   * THE PICTURES ARE OUTSIDE REACT'S OPINION, which is what makes this one of the
   * few honest uses of an effect here. Every screenshot and diagram picks its
   * appearance with a `prefers-color-scheme` `<source>`, and a media query cannot
   * see the `data-theme` override. `syncPicturesToTheme` rewrites those queries,
   * and it has to run again after a client-side navigation because the new page
   * arrives with fresh `<source>` elements carrying the original media. With no
   * override it touches nothing, so the default path costs one query selector.
   */
  useEffect(() => {
    syncPicturesToTheme();
  }, [pathname]);

  return (
    /* `overflow-x-clip` and not `overflow-hidden`: the front page's diagram steps out of the
       reading column with `w-screen`, and `100vw` counts the vertical scrollbar, so that block is a
       few pixels wider than the document. Clipping horizontally swallows those pixels and leaves
       vertical scrolling alone. See `FullWidth` in `page.tsx` for the other half of the pair. */
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:m-3 focus:rounded focus:bg-card focus:p-2"
      >
        {t('site.skipToContent')}
      </a>

      <header className="border-b border-border">
        {/* ITEMS-CENTER, AND IT USED TO BE ITEMS-BASELINE. A flex container takes its baseline from
            its first item, the wordmark link, and that link is itself a flex box whose first item
            is the 24 pixel mark. An image's baseline is its bottom edge, so aligning the row on it
            hung the mark and the word "openplate" eleven pixels above the nav links beside them.
            Nothing in the markup said so and the whole header simply looked broken. There is no
            common baseline to share between a picture and a line of text: centring is the
            alignment that means what it says here. */}
        <div
          className={`mx-auto flex w-full ${WIDTH[width]} flex-wrap items-center gap-x-6 gap-y-2 ${PADDING[width]} py-5`}
        >
          <SiteLink
            to="/"
            className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-primary"
          >
            {/* Decorative: the link already says "openplate" in text, so a
                screen reader announcing the mark too would say the name twice. */}
            <img src="/icons/icon-192.png?v=2" alt="" className="h-6 w-6 rounded-full" />
            {t('site.name')}
          </SiteLink>
          {/* LAST IN THE WRAP ORDER ON A PHONE, and in DOM order everywhere else. At 390 pixels all
              three do not fit on one line, and with the natural order the toggle was pushed onto a
              third row of its own: a 164 pixel header before a word of the page. Sending the nav
              down puts the wordmark and the toggle on the first line, where the toggle is the
              first thing a thumb reaches, and the nav takes the second. `order` moves the boxes
              and not the DOM, so the tab order and the reading order are unchanged. */}
          {/* NAMED, because the footer carries a second `<nav>` and two unnamed navigation landmarks
              are one landmark as far as a screen reader's landmark list is concerned. axe-core
              reports it as `landmark-unique`; a one word label is the whole fix. */}
          <nav
            aria-label={t('site.nav.label')}
            className="order-last flex flex-wrap items-center gap-x-5 gap-y-1 text-sm sm:order-none"
          >
            {NAV_ITEMS.map((item) => (
              <SiteLink key={item.to} to={item.to} className="text-muted-foreground hover:text-foreground">
                {t(item.labelKey)}
              </SiteLink>
            ))}
          </nav>
          {/* Pushed to the far end and NOT into the footer with the language switcher: the
              appearance is a control a reader reaches for while reading, and the switcher is a
              navigation they use once. `ms-auto` takes the space that is left on its line, which
              is the header's right edge on a desktop and the wordmark's own line on a phone. */}
          <div className="ms-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" className={width === 'full' ? 'w-full grow' : `mx-auto w-full ${WIDTH[width]} grow px-5 py-12`}>
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
