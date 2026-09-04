/**
 * On this page.
 *
 * PORTED FROM collie-website's `src/components/docs-toc.tsx`, minus the
 * scroll-spy: collie marks the heading a reader is on with an IntersectionObserver
 * in a hook of its own. That is a behaviour, not a table of contents, and it is
 * not what spec 02 asks for. The shape it leaves room for is unchanged, so the
 * marker can arrive later without moving this list.
 */
import { useTranslation } from 'react-i18next';

import type { Block } from '#app/lib/docs';

export interface Section {
  id: string;
  text: string;
  level: number;
}

/**
 * The h2s and h3s of one doc, in document order.
 *
 * `flatMap` and not `filter`: a filter leaves the array typed as `Block`, so
 * every read below would have to re-narrow it to the heading it already is.
 *
 * H3s ARE INCLUDED, and they are most of the value. H2s alone give four entries
 * for a 40 KB file — a table of contents that says the document has four parts
 * and nothing about where anything is. The nesting is what makes it a map.
 */
export function sectionsOf(blocks: Block[]): Section[] {
  return blocks.flatMap((block) =>
    block.kind === 'heading' && (block.level === 2 || block.level === 3) ?
      [{ id: block.id, text: block.text, level: block.level }]
    : [],
  );
}

/**
 * ── ONE COMPONENT, TWO PLACES, NEVER BOTH AT ONCE ──
 * `doc-page.tsx` renders this twice: as a sticky rail from `xl`, and as a plain
 * block above the text below it. Each is `display: none` at the other's width,
 * and that matters beyond looks — `display: none` takes a subtree out of the
 * accessibility tree, so a screen reader meets exactly one navigation landmark
 * called "On this page" at any width. Swap either for `opacity` and it hears two.
 */
export function DocsToc({ sections, rail }: { sections: Section[]; rail: boolean }) {
  const { t } = useTranslation('docs');

  // One heading is not a map of anything.
  if (sections.length < 2) return null;

  if (!rail) {
    return (
      <nav aria-label={t('onThisPage')} className="mt-10 border-t border-border pt-5 xl:hidden">
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{t('onThisPage')}</p>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                {section.text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label={t('onThisPage')} className="sticky top-8 hidden pt-16 xl:block">
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{t('onThisPage')}</p>
      {/* `overscroll-contain` so reaching the end of a long contents list does
          not hand the wheel back to the page and jump the reader elsewhere. */}
      <div className="mt-4 max-h-[calc(100dvh-11.5rem)] overflow-y-auto overscroll-contain">
        <ul className="space-y-1">
          {sections.map((section) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className={`block py-1 text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground ${section.level === 3 ? 'pl-4' : ''}`}
              >
                {section.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
