/**
 * Both documentation navigations, below `lg`.
 *
 * PORTED FROM collie-website's `src/components/docs-mobile-nav.tsx`, on the
 * native `<dialog>` instead of Radix (see `docs-sheet.tsx`).
 *
 * Two controls at opposite ends of the screen. The FILE LIST and the SEARCH
 * sit under the header, where "what else is there" is asked on the way in. The
 * CONTENTS are fixed to the bottom, where a thumb already is in the middle of a
 * long read. Each sheet slides from the edge its control sits on, and both draw
 * the exact lists the desktop rails draw.
 *
 * The top bar is in `FRAME`, the header's own width and gutter, so its left
 * edge is the wordmark's. The search results hang from the bar itself, the full
 * width of it, and cover the page rather than push it: the bar is `sticky`,
 * which makes it the positioned parent the panel is anchored to.
 */
import { useTranslation } from 'react-i18next';

import { FRAME } from '#app/components/frame';
import { ListIcon, PanelLeftIcon } from '#app/components/icons';
import type { DocsPlace } from '#app/lib/docs-nav';
import type { DocsIndex } from '#app/lib/docs';
import { DocsSheet } from './docs-sheet';
import { DocsFileList } from './docs-sidebar';
import { DocsSearch } from './docs-search';
import { DocsSectionList, type Section } from './docs-toc';

const TRIGGER =
  'flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground';

export function DocsMobileNav({
  index,
  place,
  sections,
}: {
  index: DocsIndex;
  /** The page being read. Absent on the docs start page, which still gets the bar for its search. */
  place?: DocsPlace;
  sections: Section[];
}) {
  const { t } = useTranslation('docs');

  return (
    <>
      {/* `top-0`: the site header scrolls away, so this bar is the one thing
          stuck to the top. */}
      <div className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur lg:hidden">
        <div className={`${FRAME} flex items-center gap-3`}>
          <DocsSheet
            side="left"
            label={t('nav')}
            triggerClassName={TRIGGER}
            trigger={
              <>
                <PanelLeftIcon className="h-4 w-4" />
                {/* Words from `sm`; below it the search needs the room, and the icon keeps its name. */}
                <span className="max-sm:sr-only">{t('nav')}</span>
              </>
            }
          >
            {(close) => (
              // Pulls the rows' own padding out, so their text lines up with the sheet title.
              <div className="-mx-3">
                <DocsFileList index={index} place={place} onNavigate={close} isTouch />
              </div>
            )}
          </DocsSheet>
          <DocsSearch wrapperClassName="min-w-0 flex-1 py-1.5" panelClassName="inset-x-0" />
        </div>
      </div>

      {/* One entry is not a table of contents, and would buy a permanent bar. */}
      {
        sections.length < 2 ? null
          // `fixed`, not `sticky`: sticky would ride the article and leave with
          // it. The safe-area padding keeps the button above a phone's gesture bar.
        : (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
            <DocsSheet
              side="bottom"
              label={t('onThisPage')}
              triggerClassName={`${TRIGGER} w-full justify-center`}
              trigger={
                <>
                  {t('onThisPage')}
                  <ListIcon className="h-4 w-4" />
                </>
              }
            >
              {(close) => <DocsSectionList sections={sections} touch onNavigate={close} />}
            </DocsSheet>
          </div>
        )
      }
    </>
  );
}
