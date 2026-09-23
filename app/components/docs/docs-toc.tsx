/**
 * On this page.
 *
 * PORTED FROM collie-website's `src/components/docs-toc.tsx`, scroll-spy included.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Block } from '#app/lib/docs';
import { PAGE_TOP, SPY_INSET_PX } from './layout';
import { useActiveHeading } from './use-active-heading';

export interface Section {
  id: string;
  text: string;
  level: number;
}

/**
 * The h2s and h3s of one doc, in document order.
 *
 * `flatMap` and not `filter`: a filter leaves the array typed as `Block`.
 * H3s are most of the value; h2s alone say a long file has four parts and
 * nothing about where anything is.
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
 * A sticky rail from `xl`, and a flat block between `lg` and `xl`. Each is
 * `display: none` at the other's width, which also takes it out of the
 * accessibility tree, so a screen reader meets one "On this page" landmark.
 *
 * Only the rail asks for scroll-spy. The hook is still called, with no ids,
 * which makes it a no-op.
 */
export function DocsToc({ sections, rail }: { sections: Section[]; rail: boolean }) {
  const { t } = useTranslation('docs');
  // Memoised because it is an effect dependency.
  const watched = useMemo(() => (rail ? sections.map((section) => section.id) : []), [rail, sections]);
  const active = useActiveHeading({ ids: watched, insetPx: SPY_INSET_PX });

  // One heading is not a map of anything.
  if (sections.length < 2) return null;

  if (!rail) {
    return (
      // No rule of its own: the page draws one right above it.
      <nav aria-label={t('onThisPage')} className="mt-8 xl:hidden">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('onThisPage')}</p>
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
    // `top-0` because the site header is not sticky. The list height is the
    // viewport minus this block's top padding and label.
    <nav aria-label={t('onThisPage')} className={`sticky top-0 hidden xl:block ${PAGE_TOP}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('onThisPage')}</p>
      <div className="mt-4 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain pb-8">
        <DocsSectionList sections={sections} active={active} />
      </div>
    </nav>
  );
}

/**
 * The sections as an indented list without a frame, so the rail and the
 * phone's sheet draw the same indent. `touch` gives rows a thumb-sized height;
 * `onNavigate` closes the sheet, which an in-page anchor would not.
 */
export function DocsSectionList({
  sections,
  active = null,
  onNavigate,
  touch = false,
}: {
  sections: Section[];
  active?: string | null;
  onNavigate?: () => void;
  touch?: boolean;
}) {
  return (
    <ul className={touch ? 'space-y-0.5' : 'space-y-1'}>
      {sections.map((section) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            onClick={onNavigate}
            aria-current={active === section.id ? 'location' : undefined}
            className={[
              'block text-sm leading-snug transition-colors',
              touch ? 'min-h-11 py-3' : 'py-1',
              section.level === 3 ? 'pl-4' : '',
              active === section.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {section.text}
          </a>
        </li>
      ))}
    </ul>
  );
}
