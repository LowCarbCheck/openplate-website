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
 * ── ONE RAIL FOR THREE COMPONENTS, TITLES ONLY ──
 * A reader of the app's docs who needs the sync server's protocol should not
 * have to go back to the index to find it. Each group is headed by its
 * component's icon and name, and each row is a title and nothing else: the
 * README blurbs made the rail louder than the article, and they are on the docs
 * start page now.
 *
 * ── THE MARKER IS A SQUARE, NOT A LEFT BAR ──
 * A thick left accent is banned house-wide. The current page gets a 6 pixel
 * teal square before its title, the site's bullet in the colour that marks the
 * way in, and its title in the foreground ink. Every row reserves the square's
 * box, so marking a row moves no text.
 */
import { useId } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { STACK_ICONS } from '#app/components/icons';
import { useLanguage } from '#app/i18n/use-language';
import { localizePath } from '#app/i18n/language';
import { type DocsPlace, docsNavGroups } from '#app/lib/docs-nav';
import type { DocsIndex } from '#app/lib/docs';
import { DocsSearch } from './docs-search';
import { PAGE_TOP, THIN_SCROLLBAR } from './layout';

/**
 * One row. `touch` is the phone's sheet, where a row is a 44 pixel target; the
 * rail's rows are tighter because a pointer does not need the height. The
 * weight change on the current row moves nothing, because every letter of the
 * monospace body face is the same width at every weight.
 */
function rowClass({ isActive, isTouch }: { isActive: boolean; isTouch: boolean }): string {
  return [
    'flex items-center gap-2.5 px-3 text-sm leading-snug transition-colors',
    isTouch ? 'min-h-11 py-2.5' : 'py-1.5',
    isActive ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground',
  ].join(' ');
}

/** The current row's square, and every other row's empty box of the same size. */
function Marker({ isActive }: { isActive: boolean }) {
  return <span aria-hidden="true" className={`size-1.5 shrink-0 ${isActive ? 'bg-primary' : 'bg-transparent'}`} />;
}

/**
 * The grouped rows without a frame, so the desktop rail and the phone's sheet
 * draw one list. `onNavigate` closes the sheet; the rail passes nothing.
 */
export function DocsFileList({
  index,
  place,
  onNavigate,
  isTouch = false,
}: {
  index: DocsIndex;
  place?: DocsPlace;
  onNavigate?: () => void;
  /** The phone's sheet: taller rows. */
  isTouch?: boolean;
}) {
  const language = useLanguage();
  const { t } = useTranslation('docs');
  // The rail and the sheet both draw this list, so the heading ids must differ.
  const idPrefix = useId();

  return (
    <div className="space-y-6">
      {docsNavGroups({ index, place }).map((group) => {
        const Icon = STACK_ICONS[group.component];
        return (
          <div key={group.component}>
            <p
              id={`${idPrefix}-${group.component}`}
              className="flex items-center gap-2 px-3 text-sm font-semibold text-foreground"
            >
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              {t(`components.${group.component}`)}
            </p>
            <ul aria-labelledby={`${idPrefix}-${group.component}`} className="mt-1.5">
              {group.rows.map((row) => (
                <li key={row.to}>
                  {/* `Link` and `isCurrent`, not `NavLink`: a prerendered URL ends in a
                      slash, which `NavLink end` does not count as active. */}
                  <Link
                    to={localizePath(row.to, language)}
                    onClick={onNavigate}
                    aria-current={row.isCurrent ? 'page' : undefined}
                    className={rowClass({ isActive: row.isCurrent, isTouch })}
                  >
                    <Marker isActive={row.isCurrent} />
                    {row.kind === 'releases' ? t('releases') : row.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The list as the desktop rail, with the search box at its top. `top-0`: the
 * site header scrolls away, so nothing sits above a stuck rail. The list
 * scrolls inside itself, and `overscroll-contain` keeps the end of the list from
 * scrolling the page. `z-20` so the search results, which overlay the article
 * to the right of the rail, paint above it: a sticky element is a stacking
 * context of its own.
 */
export function DocsSidebar({ index, place }: { index: DocsIndex; place?: DocsPlace }) {
  const { t } = useTranslation('docs');

  return (
    <nav aria-label={t('nav')} className={`sticky top-0 z-20 flex max-h-dvh flex-col pb-8 ${PAGE_TOP}`}>
      <DocsSearch wrapperClassName="relative" panelClassName="left-0 mt-1 w-[28rem] border-x" />
      <div className={`-mx-3 mt-6 min-h-0 overflow-y-auto overscroll-contain ${THIN_SCROLLBAR}`}>
        <DocsFileList index={index} place={place} />
      </div>
    </nav>
  );
}
