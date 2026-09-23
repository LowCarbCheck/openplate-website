/**
 * The frame every documentation page sits in, the index included.
 *
 * PORTED FROM collie-website's `src/components/docs-shell.tsx`.
 *
 * ── THE COLUMNS ARRIVE ONE AT A TIME ──
 *   below lg   one column. Both navigations move into `DocsMobileNav`: a bar
 *              under the header and a bar fixed to the bottom.
 *   lg         the file list appears as a column. Moving between docs is what a
 *              reader does most.
 *   xl         the contents rail appears. Moving within one doc is second.
 *
 * ── INSIDE THE SITE'S ONE FRAME ──
 * The grid is `FRAME`, the same 72rem and 20 pixel gutter as the header, so the
 * wordmark stays put between the front page and this one. 72rem holds three
 * columns: a 14rem file list, the article, and a 12rem contents rail, with 2rem
 * between them. That leaves the article about 39rem, some 75 characters of
 * Inter a line, inside the readable range. The frame stops growing at 72rem, so
 * the rail that fits at `xl` fits at every width above it and never has to hide
 * again at `2xl`.
 *
 * `minmax(0, 1fr)` on the middle column and not `1fr`. A track's default minimum
 * is its content's min-content width, and a long shell command in a `<pre>`
 * would widen the grid and scroll the page sideways instead of the code block.
 */
import type { ReactNode } from 'react';

import { FRAME } from '#app/components/frame';
import type { DocsPlace } from '#app/lib/docs-nav';
import type { DocsIndex } from '#app/lib/docs';
import { DocsMobileNav } from './docs-mobile-nav';
import { DocsSidebar } from './docs-sidebar';
import { DocsToc, type Section } from './docs-toc';
import { PAGE_TOP } from './layout';

export function DocsShell({
  index,
  place,
  sections,
  children,
}: {
  /** Every component's rows, in the reader's language. */
  index: DocsIndex;
  /** The page being read, so its row is marked and its component shows blurbs. Absent on the index. */
  place?: DocsPlace;
  /** The page's own headings. Omitted where a page has none of its own to map. */
  sections?: Section[];
  children: ReactNode;
}) {
  const hasContentsBar = sections !== undefined && sections.length >= 2;

  return (
    <>
      {/* Outside the grid: a sticky element sticks within its own track, which
          would inset the bar by the sidebar's width. The index gets the bar too,
          because the search lives in it below lg. */}
      <DocsMobileNav index={index} place={place} sections={sections ?? []} />
      <div
        className={[
          `${FRAME} grid gap-x-8 pb-16 sm:pb-20`,
          // Room for the contents bar fixed over the foot of the page below lg.
          hasContentsBar ? 'max-lg:pb-28' : '',
          'lg:grid-cols-[14rem_minmax(0,1fr)]',
          sections === undefined ? '' : 'xl:grid-cols-[14rem_minmax(0,1fr)_12rem]',
        ].join(' ')}
      >
        <aside className="hidden lg:block">
          <DocsSidebar index={index} place={place} />
        </aside>

        {/* `min-w-0` for the same reason the track is `minmax(0, 1fr)`. */}
        <div className={`min-w-0 ${PAGE_TOP}`}>{children}</div>

        {sections === undefined ? null : (
          <aside className="hidden xl:block">
            <DocsToc sections={sections} rail />
          </aside>
        )}
      </div>
    </>
  );
}
