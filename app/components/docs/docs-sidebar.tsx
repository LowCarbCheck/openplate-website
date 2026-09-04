/**
 * THE COMPONENT'S DOCUMENTATION FILES, AS STANDING NAVIGATION.
 *
 * PORTED FROM collie-website's `src/components/docs-sidebar.tsx`.
 *
 * ── IT IS THE REPOSITORY'S OWN TABLE, ORDER AND ALL ──
 * Every row, in this order, is that repository's README documentation table out
 * of `DOCS_INDEX`. Nothing here is written for this site, so a doc renamed or
 * reordered upstream arrives on the next `pnpm sync:docs` instead of being
 * missed.
 *
 * ── EVERY ROW CARRIES ITS DESCRIPTION ──
 * A title-only sidebar assumes the titles explain themselves. "Topologies" does
 * not. The description is NOT written here either: it is the second column of
 * the README table, already synced as `entry.blurb`, and writing a shorter one
 * for the sidebar would be the second table of contents this file exists to
 * avoid.
 *
 * ── THE MARKER IS A BACKGROUND, NOT A LEFT BAR ──
 * The obvious way to mark the current row in a sidebar is a rule down its inside
 * edge, and a thick left accent is banned house-wide. A filled row says the same
 * thing, across the whole target rather than at one edge of it.
 *
 * ── THE ONE THING THE THREE-SOURCE SHAPE ADDS ──
 * A component heading above the rows, and the component's release notes as the
 * last row. collie has one repository and needs neither.
 */
import { NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '#app/i18n/use-language';
import { localizePath } from '#app/i18n/language';
import { docRoute, releasesRoute } from '#app/lib/doc-routes';
import { type ComponentDocs, spansText } from '#app/lib/docs';

function rowClass(active: boolean): string {
  return `block rounded-sm px-3 py-2.5 transition-colors ${active ? 'bg-muted' : 'hover:bg-muted/60'}`;
}

export function DocsFileList({ docs, current }: { docs: ComponentDocs; current?: string }) {
  const language = useLanguage();
  const { t } = useTranslation('docs');

  return (
    // The gap BETWEEN two rows has to beat the gap WITHIN one: a title and its
    // description are a pair, and tighter than this the next title sits closer
    // to the description above it than that description sits to its own title.
    <ul className="space-y-0.5">
      {docs.entries.map((entry) => (
        <li key={entry.slug}>
          <NavLink
            to={localizePath(docRoute(docs.component, entry.slug), language)}
            end
            className={({ isActive }) => rowClass(isActive || entry.slug === current)}
          >
            <span className="block text-sm font-semibold leading-snug text-foreground">{entry.title}</span>
            {/* `spansText` and not `<Spans>`: this sits inside the row's own
                anchor, and a `link` span would put an anchor inside an anchor,
                which browsers silently un-nest and which breaks the row. */}
            <span className="mt-1.5 line-clamp-2 text-[0.8125rem] leading-snug text-muted-foreground">
              {spansText(entry.blurb)}
            </span>
          </NavLink>
        </li>
      ))}
      <li>
        <NavLink
          to={localizePath(releasesRoute(docs.component), language)}
          end
          className={({ isActive }) => rowClass(isActive)}
        >
          <span className="block text-sm font-semibold leading-snug text-foreground">{t('releases')}</span>
        </NavLink>
      </li>
    </ul>
  );
}

/** The list as the desktop rail: a sticky column with the component's name over it. */
export function DocsSidebar({ docs, current }: { docs: ComponentDocs; current?: string }) {
  const { t } = useTranslation('docs');

  return (
    <nav aria-label={t('nav')} className="sticky top-8 flex max-h-[calc(100dvh-4rem)] flex-col pb-8 pt-16">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{t(`components.${docs.component}`)}</p>
      <div className="mt-4 min-h-0 overflow-y-auto overscroll-contain">
        <DocsFileList docs={docs} current={current} />
      </div>
    </nav>
  );
}
