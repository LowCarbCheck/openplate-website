/**
 * The frame every page renders inside: a wordmark, the nav and a language
 * switcher, the page itself, and a footer with the site map, the links to the
 * app's legal pages and the source.
 *
 * The switcher is a list of plain links behind a language button: every page
 * exists as a real file in every language, so switching is a navigation and
 * needs no script beyond the one that opens the list. It is built by canonicalizing the current path and localizing it
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
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useRouteLoaderData } from 'react-router';

import { FRAME } from './frame';
import { ChevronDownIcon, CloseIcon, GitHubMark, LanguagesIcon, MenuIcon } from './icons';
import { ExternalLink, SiteLink } from './site-link';
import { ThemeToggle } from './theme-toggle';
import { Wordmark } from './wordmark';
import { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, canonicalizePath, localizePath } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';
import { syncPicturesToTheme } from '#app/lib/theme';
import { PRICING_PATH } from '#app/pricing-config';
import type { loader as rootLoader } from '#app/root';
import { APP_IMPRINT_URL, APP_TERMS_URL, APP_URL, APP_WEBSITE_PRIVACY_URL, REPOSITORIES } from '#app/site';

interface NavItem {
  to: string;
  labelKey: string;
}

/** A self-hosting page: a nav item that also carries one line saying what the page is for. */
interface MenuItem extends NavItem {
  hintKey: string;
}

/**
 * ── THE NAVIGATION IS THREE GROUPS, NOT ONE LIST ──
 * The app first, because it is the product. Then the three self-hosting pages, which a reader who
 * came to use openplate does not need and a reader who came to run it needs all of, so they sit
 * behind one button instead of taking three places in the row. Then the flat links after it. A new
 * page goes into whichever group it belongs to; the header, the phone panel and the footer all read
 * these same constants.
 */
const APP_ITEM: NavItem = { to: '/app', labelKey: 'site.nav.app' };

const SELF_HOSTING_ITEMS: MenuItem[] = [
  { to: '/deploy', labelKey: 'site.nav.deploy', hintKey: 'site.nav.deployHint' },
  { to: '/core', labelKey: 'site.nav.core', hintKey: 'site.nav.coreHint' },
  { to: '/inference', labelKey: 'site.nav.inference', hintKey: 'site.nav.inferenceHint' },
];

const NAV_ITEMS: NavItem[] = [
  { to: '/research', labelKey: 'site.nav.research' },
  { to: '/docs', labelKey: 'site.nav.docs' },
];

/**
 * The data sources page, in the footer's Project column and NOT in the header row, which is full.
 *
 * A reader looks for it after a number made them ask, not on arrival, and the pages that show
 * numbers link to it where they do. The label is the page's own link label, the same words those
 * inline links use.
 */
const SOURCES_ITEM: NavItem = { to: '/sources', labelKey: 'pages.sources.linkLabel' };

/**
 * The last link, in a build that has a price and in no other.
 *
 * It borrows the page's own title rather than a nav label of its own: a
 * navigation that says one word and the page it opens says another is two
 * strings to translate and one of them will drift.
 */
const PRICING_NAV_ITEM: NavItem = { to: PRICING_PATH, labelKey: 'pages.pricing.title' };

/**
 * Null in a build that was given no `PRICING_PRICE_EUR`, which is every local build.
 *
 * Read from the root loader, which is where this site's build-time
 * configuration reaches the browser (`root.tsx`). The frame cannot read
 * `process.env` itself: it is the one component that renders in a browser as
 * well as during the prerender pass.
 */
function usePriceEur(): string | null {
  const data = useRouteLoaderData<typeof rootLoader>('root');
  return data?.priceEur ?? null;
}

/** The flat links after the Self-hosting menu, which gain the pricing page when there is a price. */
function useNavItems(): NavItem[] {
  const priceEur = usePriceEur();
  if (priceEur === null) return NAV_ITEMS;
  return [...NAV_ITEMS, PRICING_NAV_ITEM];
}

/**
 * The ids the two disclosure buttons point their `aria-controls` at, written once.
 *
 * There is one header on the page, so a constant is enough and `useId` would only make the value
 * unpredictable in a prerendered file for no gain.
 */
const MENU_PANEL_ID = 'site-nav-panel';
const SELF_HOSTING_PANEL_ID = 'site-self-hosting-panel';
const LANGUAGE_PANEL_ID = 'site-language-panel';
const PHONE_LANGUAGE_PANEL_ID = 'site-phone-language-panel';

/**
 * A square icon button, and the SECOND copy of the string `theme-toggle.tsx` calls `BUTTON`.
 *
 * The two are deliberately the same shape: the source link, the appearance toggle, the language
 * button and the menu button sit in one row at the right edge, and a reader reads them as one kind.
 * Exporting one of them from the other file would put a layout decision about this header inside a
 * component that knows nothing about it, so the string is repeated and named instead.
 *
 * `p-3` around a 20 pixel icon is 44 pixels square, the smallest a touch target is allowed to be.
 * `p-2` measured at 36 pixels and was under it.
 */
const ICON_BUTTON =
  'flex items-center p-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

/**
 * The header's own filled button, the page's `PRIMARY_ACTION` at the header's size.
 *
 * `h-9` and `text-sm`, because the header row is 64 pixels and the hero's 44 pixel button with its
 * larger type would fill it edge to edge. It is not a second copy of the hero's string on purpose:
 * the two differ in exactly the properties that make one a header control and the other a call to
 * action. The header's copy adds `whitespace-nowrap`, so the longest translation widens the button
 * rather than wrapping in a row that must not grow. The phone panel's copy wraps instead, inside a
 * `min-h-11` box, because a full width button that cannot wrap is a label that leaves its border.
 */
const HEADER_ACTION =
  'items-center bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90';

/** The grey eyebrow over a group of links, the application's section label. */
const EYEBROW = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

/**
 * Whether a nav item is the page being read, or a page under it.
 *
 * Compared on the canonical path, so `/en/docs/app/architecture` marks "Docs" exactly as the German
 * `/docs/app/architecture` does.
 */
function isActiveItem({ item, canonical }: { item: NavItem; canonical: string }): boolean {
  return canonical === item.to || canonical.startsWith(`${item.to}/`);
}

/** The canonical path of the page being read, the one thing every active mark compares against. */
function useCanonicalPath(): string {
  return canonicalizePath(useLocation().pathname);
}

/**
 * The tone of a nav link, active or not.
 *
 * The active item is the one place in the header that spends the teal, as in the application's
 * public header. Weight stays the same on both, so marking an item never changes its width.
 */
function linkTone(isActive: boolean): string {
  return isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground';
}

/**
 * A run of flat nav links, drawn in two places and written in one.
 *
 * A wide window gets them inline and a phone gets them in the panel below the header row. Those are
 * two elements in the DOM at once, and the alternative to this component is the same `map` twice,
 * where a class fixed in one row quietly stays wrong in the other.
 *
 * `linkClassName` is how the panel asks for its own vertical padding without the inline row gaining
 * it too: the panel's links need a 44 pixel tap target and the inline row, sitting in a header that
 * must not grow, does not.
 */
function NavLinks({ items, linkClassName }: { items: NavItem[]; linkClassName?: string }) {
  const { t } = useTranslation();
  const canonical = useCanonicalPath();

  return items.map((item) => (
    <SiteLink
      key={item.to}
      to={item.to}
      className={`whitespace-nowrap transition-colors ${linkTone(isActiveItem({ item, canonical }))} ${linkClassName ?? ''}`}
    >
      {t(item.labelKey)}
    </SiteLink>
  ));
}

/**
 * One self-hosting page as a link with its hint under it, in the desktop menu and the phone panel.
 *
 * The label is the only part that turns teal on the active page: the hint is a description of the
 * page, not the way to it.
 */
function MenuItemLink({ item, className, onSelect }: { item: MenuItem; className: string; onSelect?: () => void }) {
  const { t } = useTranslation();
  const isActive = isActiveItem({ item, canonical: useCanonicalPath() });

  // `onSelect` because a click on the page already being read changes no pathname, so the menu that
  // closes on a navigation has to hear that click some other way.
  return (
    <li>
      <SiteLink to={item.to} className={`block transition-colors ${className}`} onClick={onSelect}>
        <span className={`block font-medium ${isActive ? 'text-primary' : 'text-foreground'}`}>{t(item.labelKey)}</span>
        <span className="mt-0.5 block font-prose text-sm text-muted-foreground">{t(item.hintKey)}</span>
      </SiteLink>
    </li>
  );
}

/** What a disclosure button and the list it opens share: whether it is open, and how to close it. */
interface Disclosure {
  isOpen: boolean;
  toggle: () => void;
  close: () => void;
  /** The element a press must land outside of to close the list: the button and the list together. */
  wrapperRef: RefObject<HTMLDivElement | null>;
  /** Where Escape hands focus back to. */
  buttonRef: RefObject<HTMLButtonElement | null>;
}

/**
 * The open and close rules of every disclosure in this frame, written once.
 *
 * The Self-hosting menu, the language menu and the phone panel's language list all close the same
 * three ways, described on `SelfHostingMenu` below. Three copies of two listeners is where one of
 * them quietly stops handing focus back.
 */
function useDisclosure(): Disclosure {
  const { pathname } = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isOpen) return undefined;

    function handlePointerDown(event: PointerEvent): void {
      const wrapper = wrapperRef.current;
      if (wrapper === null) return;
      if (event.target instanceof Node && wrapper.contains(event.target)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      setIsOpen(false);
      buttonRef.current?.focus();
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return {
    isOpen,
    toggle: () => {
      setIsOpen((open) => !open);
    },
    close: () => {
      setIsOpen(false);
    },
    wrapperRef,
    buttonRef,
  };
}

/**
 * The Self-hosting disclosure in the wide header.
 *
 * ── A DISCLOSURE, NOT A MENU ──
 * It is a button that shows and hides a list of ordinary links, so it carries `aria-expanded` and
 * `aria-controls` and nothing else. The ARIA `menu` role would promise arrow-key navigation and a
 * roving focus that three links do not need; Tab walks them.
 *
 * ── IT OVERLAYS, IT NEVER PUSHES ──
 * The panel is `absolute`, anchored to a wrapper exactly as tall as the header row, so its top edge
 * is the header's bottom border and opening it moves nothing on the page. The header carries a
 * `z-40` so the panel paints over the hero, which is its own stacking context later in the DOM.
 *
 * ── THREE WAYS TO CLOSE ──
 * Escape, which also hands focus back to the button so a keyboard reader is not left on a link that
 * just disappeared; a press anywhere outside the wrapper; and a navigation, heard as a change of
 * pathname. A click on the link to the page already open changes no pathname, so the list items
 * close it themselves. The listeners exist only while the panel is open.
 */
function SelfHostingMenu() {
  const { t } = useTranslation();
  const canonical = useCanonicalPath();
  const { isOpen, toggle, close, wrapperRef, buttonRef } = useDisclosure();

  const isCurrentSection = SELF_HOSTING_ITEMS.some((item) => isActiveItem({ item, canonical }));

  return (
    <div ref={wrapperRef} className="relative flex h-16 items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={SELF_HOSTING_PANEL_ID}
        onClick={toggle}
        className={`flex items-center gap-1 whitespace-nowrap transition-colors ${linkTone(isCurrentSection)}`}
      >
        {t('site.nav.selfHosting')}
        <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {/* Rendered only while open, for the tab-order reason the phone panel gives below. */}
      {isOpen && (
        <ul
          id={SELF_HOSTING_PANEL_ID}
          className="absolute top-full left-0 z-50 mt-px w-80 border border-border bg-card py-2 shadow-lg"
        >
          {SELF_HOSTING_ITEMS.map((item) => (
            <MenuItemLink key={item.to} item={item} className="px-4 py-3 hover:bg-muted" onSelect={close} />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * One link per language, each to the page being read in that language, in declared order.
 *
 * The desktop menu and the phone panel draw the same list, so it is written once. Each language is
 * named in itself, "Deutsch" and not "German", because the reader looking for it may not read the
 * language the page is in. `lang` says so to a screen reader, which would otherwise pronounce
 * "Français" with a German voice. The current language is a link too, marked teal and with
 * `aria-current`, so the list keeps one shape and a reader can see where they are in it.
 */
function LanguageLinks({ linkClassName, onSelect }: { linkClassName: string; onSelect: () => void }) {
  const current = useLanguage();
  const canonical = useCanonicalPath();

  return SUPPORTED_LANGUAGES.map((language) => {
    const isCurrent = language === current;
    return (
      <li key={language}>
        <Link
          to={localizePath(canonical, language)}
          lang={language}
          hrefLang={language}
          aria-current={isCurrent ? 'true' : undefined}
          onClick={onSelect}
          className={`transition-colors ${linkTone(isCurrent)} ${linkClassName}`}
        >
          {LANGUAGE_LABELS[language]}
        </Link>
      </li>
    );
  });
}

/**
 * The language switcher in the wide header: a language button that opens the list of languages.
 *
 * The same disclosure as `SelfHostingMenu`, with the same three ways to close, and its panel
 * overlays the page the same way. It is anchored to the RIGHT edge of its button, not the left:
 * the button is one of the last things in the header row, and a panel hanging to its right would
 * leave the window.
 */
function LanguageMenu() {
  const { t } = useTranslation();
  const { isOpen, toggle, close, wrapperRef, buttonRef } = useDisclosure();

  return (
    <div ref={wrapperRef} className="relative flex h-16 items-center">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={LANGUAGE_PANEL_ID}
        onClick={toggle}
        className={ICON_BUTTON}
      >
        <LanguagesIcon className="h-5 w-5" />
        <span className="sr-only">{t('site.language.label')}</span>
      </button>
      {isOpen && (
        <nav aria-label={t('site.language.label')} id={LANGUAGE_PANEL_ID}>
          <ul className="absolute top-full right-0 z-50 mt-px w-48 border border-border bg-card py-2 text-sm shadow-lg">
            <LanguageLinks linkClassName="block px-4 py-2.5 hover:bg-muted" onSelect={close} />
          </ul>
        </nav>
      )}
    </div>
  );
}

/**
 * The last row of the phone panel: the source link, the appearance toggle and the languages.
 *
 * ── THE CONTROLS MOVED HERE FROM THE HEADER ROW ──
 * Below `xl` the header line carries the wordmark and the menu button and nothing else. The three
 * icons beside them made a crowded line on a phone for controls a reader uses once, if at all, so
 * they wait at the bottom of the panel, at the same 44 pixel size they have in the header.
 *
 * ── THE LANGUAGES ARE A DISCLOSURE OF THEIR OWN, NEVER A LIST ──
 * Six names spelled out do not fit one 390 pixel row beside two icons, and a language switcher
 * belongs behind a button on a phone exactly as it does in the wide header, not spelled out on the
 * page. The language button names the current language so a reader can see what it will change, and
 * pressing it opens the same kind of panel `LanguageMenu` opens there: `absolute`, square, one
 * language per row. It opens upward, `bottom-full`, because this button sits at the bottom of the
 * phone panel and a panel opening down would run off the screen. Anchored to the button and overlaid
 * on the page, it pushes nothing.
 */
function PhoneControls() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { isOpen, toggle, close, wrapperRef, buttonRef } = useDisclosure();

  return (
    <div className="mt-4 border-t border-border pt-2">
      <div className="flex items-center gap-1">
        <ExternalLink href={REPOSITORIES.app} className={ICON_BUTTON}>
          <GitHubMark className="h-5 w-5" />
          <span className="sr-only">{t('site.footer.sourceCode')}</span>
        </ExternalLink>
        <ThemeToggle />
        <div ref={wrapperRef} className="relative ms-auto">
          <button
            ref={buttonRef}
            type="button"
            aria-expanded={isOpen}
            aria-controls={PHONE_LANGUAGE_PANEL_ID}
            onClick={toggle}
            className="flex min-h-11 items-center gap-2 px-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LanguagesIcon className="h-5 w-5" />
            <span className="sr-only">{t('site.language.label')}: </span>
            <span lang={language}>{LANGUAGE_LABELS[language]}</span>
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {isOpen && (
            <nav aria-label={t('site.language.label')} id={PHONE_LANGUAGE_PANEL_ID}>
              <ul className="absolute right-0 bottom-full z-50 mb-px w-48 border border-border bg-card py-2 text-sm shadow-lg">
                <LanguageLinks linkClassName="flex min-h-11 items-center px-4 hover:bg-muted" onSelect={close} />
              </ul>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The phone panel's contents: every page the wide header links to, in the same order, with the
 * self-hosting pages under an eyebrow and with their hints, and the way in at the end.
 *
 * `py-3` ON EACH LINK, NOT A GAP ON THE PANEL. A 20 pixel tap area with a 12 pixel dead gap on either
 * side is a target under the 44 pixel minimum and a strip of space that does nothing when pressed.
 * Padding turns that dead gap into part of the target instead of adding to it.
 */
function PhoneNav() {
  const { t } = useTranslation();
  const navItems = useNavItems();

  return (
    <div className="flex flex-col pb-4 text-sm">
      <NavLinks items={[APP_ITEM]} linkClassName="py-3" />
      <p className={`${EYEBROW} pt-4 pb-1`}>{t('site.nav.selfHosting')}</p>
      <ul>
        {SELF_HOSTING_ITEMS.map((item) => (
          <MenuItemLink key={item.to} item={item} className="py-3" />
        ))}
      </ul>
      <NavLinks items={navItems} linkClassName="py-3" />
      {/* The panel is only ever drawn below `xl`, and below `xl` the header row does not carry this
          button, so the panel always does. */}
      <ExternalLink
        href={APP_URL}
        className={`${HEADER_ACTION} mt-3 flex min-h-11 justify-center py-2.5 text-center leading-snug text-balance`}
      >
        {t('site.nav.openApp')}
      </ExternalLink>
      <PhoneControls />
    </div>
  );
}

/** One footer column: a grey eyebrow title and a list of links under it. */
function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className={EYEBROW}>{title}</h2>
      <ul className="mt-3 space-y-2">{children}</ul>
    </div>
  );
}

const FOOTER_LINK = 'text-muted-foreground transition-colors hover:text-foreground';

/**
 * The Legal column, which leaves this site: the imprint, the privacy notice and the terms are the
 * app's pages (M246, `app/site.ts` says why). Every page renders this footer, so the imprint is one
 * click from anywhere on the site, which is what the Impressumspflicht asks for.
 *
 * Exported for `tests/unit/legal-links.test.ts`.
 */
export const LEGAL_LINKS = [
  { href: APP_IMPRINT_URL, labelKey: 'site.footer.imprint' },
  { href: APP_WEBSITE_PRIVACY_URL, labelKey: 'site.footer.privacy' },
  { href: APP_TERMS_URL, labelKey: 'site.footer.terms' },
] as const satisfies readonly { href: string; labelKey: string }[];

function FooterSiteLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  return (
    <li>
      <SiteLink to={item.to} className={FOOTER_LINK}>
        {t(item.labelKey)}
      </SiteLink>
    </li>
  );
}

/**
 * The site map at the foot of every page, in the same groups as the header.
 *
 * It reuses the header's constants, so a page added to a group arrives in both places. The docs link
 * sits under Self-hosting here and not in a column of its own, because the documentation is where a
 * reader who runs openplate goes next, and a fifth column holding one link is a column of air.
 */
function SiteFooter() {
  const { t } = useTranslation();
  const hasPrice = usePriceEur() !== null;
  const docsItem: NavItem = { to: '/docs', labelKey: 'site.nav.docs' };
  const researchItem: NavItem = { to: '/research', labelKey: 'site.nav.research' };

  return (
    <div className="space-y-10 text-sm">
      <div className="max-w-sm">
        <SiteLink to="/" className="text-foreground transition-opacity hover:opacity-80">
          <Wordmark className="text-lg" />
        </SiteLink>
        <p className="mt-3 font-prose text-muted-foreground">{t('site.footer.blurb')}</p>
      </div>
      {/* NAMED for the same `landmark-unique` reason as the header's nav, see the comment there. */}
      <nav aria-label={t('site.footer.label')} className="grid grid-cols-2 gap-8 md:grid-cols-4">
        <FooterColumn title={t('site.footer.product')}>
          <FooterSiteLink item={APP_ITEM} />
          {hasPrice && <FooterSiteLink item={PRICING_NAV_ITEM} />}
          <li>
            <ExternalLink href={APP_URL} className={FOOTER_LINK}>
              {t('site.nav.openApp')}
            </ExternalLink>
          </li>
        </FooterColumn>
        <FooterColumn title={t('site.footer.selfHosting')}>
          {SELF_HOSTING_ITEMS.map((item) => (
            <FooterSiteLink key={item.to} item={item} />
          ))}
          <FooterSiteLink item={docsItem} />
        </FooterColumn>
        <FooterColumn title={t('site.footer.project')}>
          <FooterSiteLink item={researchItem} />
          <FooterSiteLink item={SOURCES_ITEM} />
          <li>
            <ExternalLink href={REPOSITORIES.app} className={FOOTER_LINK}>
              {t('site.footer.sourceCode')}
            </ExternalLink>
          </li>
        </FooterColumn>
        <FooterColumn title={t('site.footer.legal')}>
          {LEGAL_LINKS.map((link) => (
            <li key={link.href}>
              <ExternalLink href={link.href} className={FOOTER_LINK}>
                {t(link.labelKey)}
              </ExternalLink>
            </li>
          ))}
        </FooterColumn>
      </nav>
    </div>
  );
}

/**
 * How wide the page under the frame is allowed to be. The frame itself does not change.
 *
 * ── THREE PAGE WIDTHS, ONE FRAME ──
 * `reading` is one column of prose at 48rem, for a page that is nothing but prose. `marketing` is
 * 72rem, because those pages carry grids of screenshots and rows of cards that a measure chosen for
 * sentences folds up. `docs` is a page that draws its own grid, the file list, the article and the
 * contents rail, so `main` only spans the window and `DocsShell` lays the columns out inside `FRAME`.
 *
 * A WIDER PAGE IS NOT A WIDER PARAGRAPH. Running text keeps its own measure inside a `marketing`
 * page: `Section` in `page.tsx` caps the paragraphs it holds, and `DocBlocks` caps the quoted ones.
 *
 * The header and the footer take `FRAME` on every one of these, and they used to follow the page
 * instead. See `frame.ts` for why that stopped.
 */
export const PAGE_WIDTHS = ['reading', 'marketing', 'docs'] as const;

export type PageWidth = (typeof PAGE_WIDTHS)[number];

const MAIN = {
  reading: 'mx-auto w-full max-w-3xl grow px-5 py-12',
  marketing: `${FRAME} grow py-12`,
  docs: 'w-full grow',
} as const satisfies Record<PageWidth, string>;

export function SiteLayout({
  children,
  width = 'reading',
}: {
  children: ReactNode;
  /** The width of `main` only. The header and the footer are `FRAME` whatever this says. */
  width?: PageWidth;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navItems = useNavItems();

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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:m-3 focus:bg-card focus:p-2">
        {t('site.skipToContent')}
      </a>

      {/* The application's public header, minus its `fixed`: `h-16`, a 95 percent veil and a
          hairline. It stays in the flow because the documentation's own sidebar, contents rail and
          phone bar are `sticky top-0`, and a pinned header would sit over all three. The height is
          on the ROW, not on the header, so the phone menu below it can still open.
          `relative z-40` is for the Self-hosting panel: the veil's `backdrop-blur` makes the header
          a stacking context, and without an index of its own the hero's `isolate` section, later in
          the DOM, would paint over the open panel. */}
      <header className="relative z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className={FRAME}>
          {/* ITEMS-CENTER, AND IT USED TO BE ITEMS-BASELINE. A flex container takes its baseline from
              its first item, the wordmark link, and that link is itself a flex box whose first item
              is the 24 pixel mark. An image's baseline is its bottom edge, so aligning the row on it
              hung the mark and the word "openplate" eleven pixels above the nav links beside them.
              There is no common baseline to share between a picture and a line of text: centring is
              the alignment that means what it says here. */}
          <div className="flex h-16 items-center gap-x-6">
            <SiteLink
              to="/"
              className="flex shrink-0 items-center gap-3 text-foreground transition-opacity hover:opacity-80"
            >
              {/* Decorative: the link already says "openplate" in text, so a
                  screen reader announcing the mark too would say the name twice. */}
              <img src="/icons/icon-192.png?v=2" alt="" className="h-6 w-6" />
              {/* Lifted by 0.08em, the application's `besideMark`: a flex row centres the line box,
                  and a lowercase word on its baseline otherwise hangs low against the mark. */}
              <Wordmark className="relative top-[-0.08em] text-lg" />
            </SiteLink>
            {/* HIDDEN BELOW `xl`, WHERE THE MENU BUTTON OWNS THESE LINKS INSTEAD. The row holds the
                app, the Self-hosting button, two or three flat links, three icons and a filled
                button. It was `lg` until the language menu joined the icons, and measured in a
                build with a price, French and Turkish then ran 94 pixels past the row at 1024 and
                18 past it at 1100; they were already 46 over at 1024 before the language button. At 1280
                every language fits. Below `xl` the links move into a panel a reader opens. */}
            {/* NAMED, because the page carries several of these landmarks at once and two unnamed
                navigation landmarks are one landmark as far as a screen reader's landmark list is
                concerned. axe-core reports it as `landmark-unique`; a one word label is the whole
                fix. The panel below is a second `<nav>` and carries its own, different name for the
                same reason, and the footer's `<nav>` carries `site.footer.label`. */}
            <nav aria-label={t('site.nav.label')} className="hidden items-center gap-x-5 text-sm xl:flex">
              <NavLinks items={[APP_ITEM]} />
              <SelfHostingMenu />
              <NavLinks items={navItems} />
            </nav>
            {/* PUSHED TO THE FAR END. `ms-auto` takes whatever space is left on the line, so the
                controls sit at the right edge on a desktop and at the right edge of the wordmark's
                own line on a phone. The menu button is last because it opens the row beneath it,
                and a control should sit next to what it moves. */}
            <div className="ms-auto flex shrink-0 items-center gap-1">
              {/* BELOW `xl` THE ROW IS THE WORDMARK AND THE MENU BUTTON, NOTHING ELSE. These three
                  controls wait at the bottom of the phone panel there, see `PhoneControls`. */}
              <div className="hidden items-center gap-1 xl:flex">
                <ExternalLink href={REPOSITORIES.app} className={ICON_BUTTON}>
                  <GitHubMark className="h-5 w-5" />
                  {/* The mark is `aria-hidden`, so without these words the link has no accessible
                      name at all. It reuses the footer's key: it is the same link to the same place. */}
                  <span className="sr-only">{t('site.footer.sourceCode')}</span>
                </ExternalLink>
                <ThemeToggle />
                <LanguageMenu />
              </div>
              {/* The header's one filled control, and it leaves for the application's host, so it is
                  an `ExternalLink`. Hidden below `xl`, where the panel carries the same button at
                  full width and the row keeps only the wordmark and the menu button. */}
              <ExternalLink
                href={APP_URL}
                className={`${HEADER_ACTION} ms-2 hidden h-9 whitespace-nowrap xl:inline-flex`}
              >
                {t('site.nav.openApp')}
              </ExternalLink>
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
                className={`${ICON_BUTTON} xl:hidden`}
              >
                {isMenuOpen ?
                  <CloseIcon className="h-5 w-5" />
                : <MenuIcon className="h-5 w-5" />}
                <span className="sr-only">{t('site.nav.menu')}</span>
              </button>
            </div>
          </div>
          {/* RENDERED ONLY WHEN IT IS OPEN, which is what keeps it out of the tab order the rest of
              the time. A panel that is merely invisible still takes its tab stops between the menu
              button and the page, and a reader on a keyboard would walk through links they cannot
              see. It sits after the button in the DOM as well as under it on the screen, so tabbing
              out of the button arrives at the first link. It pushes the page down, which is allowed:
              the reader asked for it, and nothing above the button moves. */}
          {isMenuOpen && (
            <nav id={MENU_PANEL_ID} aria-label={t('site.nav.menu')} className="xl:hidden">
              <PhoneNav />
            </nav>
          )}
        </div>
      </header>

      <main id="main" className={MAIN[width]}>
        {children}
      </main>

      <footer className="border-t border-border">
        <div className={`${FRAME} py-10`}>
          <SiteFooter />
        </div>
      </footer>
    </div>
  );
}
