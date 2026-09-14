/**
 * THE DOCUMENTATION OF ALL THREE COMPONENTS, AS STANDING NAVIGATION.
 *
 * PORTED FROM collie-website's `src/components/docs-sidebar.tsx`.
 *
 * ── IT IS THE REPOSITORIES' OWN TABLES, ORDER AND ALL ──
 * Every row, in this order, is a README documentation table out of
 * `DOCS_INDEX`. Nothing here is written for this site, so a doc renamed or
 * reordered upstream arrives on the next `pnpm sync:docs` instead of being
 * missed. The grouping itself is `docsNavGroups`, which is pure and tested.
 *
 * ── ONE RAIL FOR THREE COMPONENTS ──
 * A reader of the app's docs who needs the sync server's protocol should not
 * have to go back to the index to find it. Only the component being read shows
 * its blurbs, which are the second column of its README table and not written
 * here; the other groups are titles, so the rail stays scannable.
 *
 * ── THE MARKER IS A BACKGROUND, NOT A LEFT BAR ──
 * A thick left accent is banned house-wide. A filled row says the same thing,
 * across the whole target rather than at one edge of it.
 */
import { useId } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '#app/i18n/use-language';
import { localizePath } from '#app/i18n/language';
import { type DocsPlace, docsNavGroups } from '#app/lib/docs-nav';
import { type DocsIndex, spansText } from '#app/lib/docs';
import { PAGE_TOP } from './layout';

function rowClass(isActive: boolean): string {
  return `block rounded-sm px-3 py-2.5 transition-colors ${isActive ? 'bg-muted' : 'hover:bg-muted/60'}`;
}

const TITLE = 'block text-sm font-semibold leading-snug text-foreground';

/**
 * The grouped rows without a frame, so the desktop rail and the phone's sheet
 * draw one list. `onNavigate` closes the sheet; the rail passes nothing.
 */
export function DocsFileList({
  index,
  place,
  onNavigate,
}: {
  index: DocsIndex;
  place?: DocsPlace;
  onNavigate?: () => void;
}) {
  const language = useLanguage();
  const { t } = useTranslation('docs');
  // The rail and the sheet both draw this list, so the heading ids must differ.
  const idPrefix = useId();

  return (
    <div className="space-y-6">
      {docsNavGroups({ index, place }).map((group) => (
        <div key={group.component}>
          <p
            id={`${idPrefix}-${group.component}`}
            className="px-3 font-display text-base font-semibold text-foreground"
          >
            {t(`components.${group.component}`)}
          </p>
          {/* The gap between rows beats the gap inside one, so a title and its
              blurb read as a pair. */}
          <ul aria-labelledby={`${idPrefix}-${group.component}`} className="mt-2 space-y-0.5">
            {group.rows.map((row) => (
              <li key={row.to}>
                {/* `Link` and `isCurrent`, not `NavLink`: a prerendered URL ends in a
                    slash, which `NavLink end` does not count as active. */}
                <Link
                  to={localizePath(row.to, language)}
                  onClick={onNavigate}
                  aria-current={row.isCurrent ? 'page' : undefined}
                  className={rowClass(row.isCurrent)}
                >
                  {row.kind === 'releases' ?
                    <span className={TITLE}>{t('releases')}</span>
                  : <>
                      <span className={TITLE}>{row.title}</span>
                      {/* `spansText`, not `<Spans>`: a link span would nest an
                          anchor inside this anchor. No `block` beside
                          `line-clamp-2`, which sets `display` too. */}
                      {row.blurb === null ? null : (
                        <span className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">
                          {spansText(row.blurb)}
                        </span>
                      )}
                    </>
                  }
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/**
 * The list as the desktop rail. `top-0`: the site header scrolls away, so
 * nothing sits above a stuck rail. It scrolls inside itself, and
 * `overscroll-contain` keeps the end of the list from scrolling the page.
 */
export function DocsSidebar({ index, place }: { index: DocsIndex; place?: DocsPlace }) {
  const { t } = useTranslation('docs');

  return (
    <nav aria-label={t('nav')} className={`sticky top-0 flex max-h-dvh flex-col pb-8 ${PAGE_TOP}`}>
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{t('nav')}</p>
      <div className="-mx-3 mt-4 min-h-0 overflow-y-auto overscroll-contain">
        <DocsFileList index={index} place={place} />
      </div>
    </nav>
  );
}
