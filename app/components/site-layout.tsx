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
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { CloseIcon, GitHubMark, MenuIcon } from './icons';
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
  { to: '/core', labelKey: 'site.nav.core' },
  { to: '/inference', labelKey: 'site.nav.inference' },
  { to: '/deploy', labelKey: 'site.nav.deploy' },
  { to: '/docs', labelKey: 'site.nav.docs' },
] as const;

/**
 * The id the menu button points its `aria-controls` at, written once.
 *
 * There is one header on the page, so a constant is enough and `useId` would only make the value
 * unpredictable in a prerendered file for no gain.
 */
const MENU_PANEL_ID = 'site-nav-panel';

/**
 * A round icon button, and the SECOND copy of the string `theme-toggle.tsx` calls `BUTTON`.
 *
 * The two are deliberately the same shape: the source link, the appearance toggle and the menu
 * button sit in one row at the right edge, and a reader reads them as three of a kind. Exporting
 * one of them from the other file would put a layout decision about this header inside a component
 * that knows nothing about it, so the string is repeated and named instead.
 *
 * `p-3` around a 20 pixel icon is 44 pixels square, the smallest a touch target is allowed to be.
 * `p-2` measured at 36 pixels and was under it.
 */
const ICON_BUTTON =
  'flex items-center rounded-full p-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

/**
 * The five links, drawn in two places and written in one.
 *
 * A wide window gets them inline and a phone gets them in the panel below the header row. Those are
 * two elements in the DOM at once, and the alternative to this component is the same `map` twice,
 * where a class fixed in one row quietly stays wrong in the other.
 *
 * `linkClassName` is how the panel asks for its own vertical padding without the inline row gaining
 * it too: the panel's links need a 44 pixel tap target and the inline row, sitting in a header that
 * must not grow, does not.
 */
function NavLinks({ linkClassName }: { linkClassName?: string }) {
  const { t } = useTranslation();
  const className =
    linkClassName ?
      `text-muted-foreground hover:text-foreground ${linkClassName}`
    : 'text-muted-foreground hover:text-foreground';

  return NAV_ITEMS.map((item) => (
    <SiteLink key={item.to} to={item.to} className={className}>
      {t(item.labelKey)}
    </SiteLink>
  ));
}

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

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  /*
   * A TAP ON A LINK IN THE PANEL IS A NAVIGATION, AND THE PANEL HAS TO KNOW. The router swaps the
   * page under an open menu without unmounting this frame, so without this a reader taps "Docs" and
   * then looks at the menu they just used, laid over a page they cannot see. The pathname is the
   * one thing that says a navigation happened; closing on every change of it also covers the back
   * button and a language switch. It runs on mount too, where it sets false over false and costs
   * nothing.
   */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

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
        <div className={`mx-auto w-full ${WIDTH[width]} ${PADDING[width]} py-5`}>
          {/* ITEMS-CENTER, AND IT USED TO BE ITEMS-BASELINE. A flex container takes its baseline from
              its first item, the wordmark link, and that link is itself a flex box whose first item
              is the 24 pixel mark. An image's baseline is its bottom edge, so aligning the row on it
              hung the mark and the word "openplate" eleven pixels above the nav links beside them.
              Nothing in the markup said so and the whole header simply looked broken. There is no
              common baseline to share between a picture and a line of text: centring is the
              alignment that means what it says here. */}
          <div className="flex items-center gap-x-6">
            <SiteLink
              to="/"
              className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight text-primary"
            >
              {/* Decorative: the link already says "openplate" in text, so a
                  screen reader announcing the mark too would say the name twice. */}
              <img src="/icons/icon-192.png?v=2" alt="" className="h-6 w-6 rounded-full" />
              {t('site.name')}
            </SiteLink>
            {/* HIDDEN BELOW `md`, WHERE THE BUTTON BELOW OWNS THESE LINKS INSTEAD. Five links do not
                fit beside a wordmark at 390 pixels: they took two further rows and the header was a
                164 pixel wall before a word of the page. Reordering the boxes only chose which row
                the wall was on, so the links move into a panel a reader opens, and the first line
                keeps the wordmark and the three controls. From `md` up nothing changed: this is the
                same inline row it has always been, and no panel is rendered. */}
            {/* NAMED, because the page carries several of these landmarks at once and two unnamed
                navigation landmarks are one landmark as far as a screen reader's landmark list is
                concerned. axe-core reports it as `landmark-unique`; a one word label is the whole
                fix. The panel below is a second `<nav>` and carries its own, different name for the
                same reason, and the footer's `<nav>` now carries `site.footer.label` for the same
                reason again. */}
            <nav aria-label={t('site.nav.label')} className="hidden items-center gap-x-5 text-sm md:flex">
              <NavLinks />
            </nav>
            {/* PUSHED TO THE FAR END, AND NOT INTO THE FOOTER WITH THE LANGUAGE SWITCHER: the source
                and the appearance are things a reader reaches for while reading, and the switcher is
                a navigation they use once. `ms-auto` takes whatever space is left on the line, so the
                three sit at the right edge on a desktop and at the right edge of the wordmark's own
                line on a phone. The menu button is last of the three because it is the one that opens
                the row beneath it, and a control should sit next to what it moves. */}
            <div className="ms-auto flex items-center gap-1">
              <ExternalLink href={REPOSITORIES.app} className={ICON_BUTTON}>
                <GitHubMark className="h-5 w-5" />
                {/* The mark is `aria-hidden`, so without these words the link has no accessible name
                    at all. It reuses the footer's key: it is the same link to the same place. */}
                <span className="sr-only">{t('site.footer.sourceCode')}</span>
              </ExternalLink>
              <ThemeToggle />
              {/* CLOSED IS THE ONLY STATE THE SERVER MAY RENDER. This document is prerendered to a
                  file, so anything the initial markup says about the panel has to be true for every
                  reader who opens it. Closed is that state, `useState(false)` is that claim, and the
                  panel is not in the file until a reader asks for it. */}
              <button
                type="button"
                aria-expanded={isMenuOpen}
                aria-controls={MENU_PANEL_ID}
                onClick={() => {
                  setIsMenuOpen((open) => !open);
                }}
                className={`${ICON_BUTTON} md:hidden`}
              >
                {isMenuOpen ?
                  <CloseIcon className="h-5 w-5" />
                : <MenuIcon className="h-5 w-5" />}
                <span className="sr-only">{t('site.nav.menu')}</span>
              </button>
            </div>
          </div>
          {/* RENDERED ONLY WHEN IT IS OPEN, which is what keeps it out of the tab order the rest of
              the time. A panel that is merely invisible still takes five tab stops between the menu
              button and the page, and a reader on a keyboard would walk through links they cannot
              see. It sits after the button in the DOM as well as under it on the screen, so tabbing
              out of the button arrives at the first link. */}
          {isMenuOpen && (
            <nav
              id={MENU_PANEL_ID}
              aria-label={t('site.nav.menu')}
              className="flex flex-col items-start pt-5 text-sm md:hidden"
            >
              {/* `py-3` ON THE LINK, NOT `gap-y-3` ON THE PANEL. Each link was a 20 pixel tap area
                  with a 12 pixel dead gap on either side of it, which is a target under the 44 pixel
                  minimum and a strip of space that does nothing when pressed. Padding turns that dead
                  gap into part of the target instead of adding to it, so five 44 pixel links replace
                  five 20 pixel ones without the panel simply doubling in length. */}
              <NavLinks linkClassName="py-3" />
            </nav>
          )}
        </div>
      </header>

      <main id="main" className={width === 'full' ? 'w-full grow' : `mx-auto w-full ${WIDTH[width]} grow px-5 py-12`}>
        {children}
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-baseline justify-between gap-x-6 gap-y-3 px-5 py-8 text-sm text-muted-foreground">
          {/* NAMED for the same `landmark-unique` reason as the header's nav, see the comment there. */}
          <nav aria-label={t('site.footer.label')} className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
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
