/**
 * The frame every documentation page sits in.
 *
 * PORTED FROM collie-website's `src/components/docs-shell.tsx`, with its mobile
 * navigation sheet left out: that is a stateful component of collie's own, and
 * below `lg` both lists are still reachable, the files at the foot of the page
 * and the contents above the text.
 *
 * ── THE COLUMNS ARRIVE ONE AT A TIME, AND THE ORDER IS NOT ARBITRARY ──
 *   below lg   one column. A rail here is a screen you scroll past to reach the
 *              text.
 *   lg         the file list appears as a column. Moving between docs is what a
 *              reader does most.
 *   xl         the contents rail appears. Moving within one doc is second.
 *
 * `minmax(0, 1fr)` on the middle column and not `1fr`. A grid track's default
 * minimum is `auto`, which is the content's own min-content width, and a `<pre>`
 * of a long shell command has a large one — so the column refuses to shrink, the
 * grid overflows and the whole page scrolls sideways instead of the code block
 * doing it. `0` is what lets `overflow-x-auto` inside actually work.
 */
import type { ReactNode } from 'react';

import type { ComponentDocs } from '#app/lib/docs';
import { DocsSidebar } from './docs-sidebar';
import { DocsToc, type Section } from './docs-toc';

export function DocsShell({
  docs,
  current,
  sections,
  children,
}: {
  /** The component whose file list fills the left rail. */
  docs: ComponentDocs;
  /** The slug of the page being read, so its row is marked. */
  current?: string;
  /** The page's own headings. Omitted where a page has none of its own to map. */
  sections?: Section[];
  children: ReactNode;
}) {
  return (
    <div
      className={[
        'mx-auto grid max-w-[88rem] gap-x-10 px-6 pb-16 sm:pb-20',
        'lg:grid-cols-[15rem_minmax(0,1fr)]',
        sections === undefined ? '' : 'xl:grid-cols-[15rem_minmax(0,1fr)_15rem]',
      ].join(' ')}
    >
      {/* `hidden lg:block` and not a media query in JS: the sidebar is chrome, it
          has no state, and the width it appears at is a layout fact. */}
      <aside className="hidden lg:block">
        <DocsSidebar docs={docs} current={current} />
      </aside>

      {/* `min-w-0` for the same reason the track is `minmax(0, …)`. The track can
          shrink now; this is what lets the content inside it agree to. */}
      <div className="min-w-0 pt-16">{children}</div>

      {sections === undefined ? null : (
        <aside className="hidden xl:block">
          <DocsToc sections={sections} rail />
        </aside>
      )}
    </div>
  );
}
