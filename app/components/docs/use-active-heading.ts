/**
 * Which heading the reader is under.
 *
 * PORTED FROM collie-website's `src/hooks/use-active-heading.ts`.
 *
 * An IntersectionObserver rather than a scroll handler: measuring every heading
 * on each scroll event forces layout at wheel frequency. The root margin
 * shrinks the viewport to a band near its top, so a heading turns active as its
 * section reaches the reading line. Between headings nothing is in the band, and
 * the last answer is kept, because the reader is still under that heading.
 */
import { useEffect, useState } from 'react';

export function useActiveHeading({ ids, insetPx }: { ids: readonly string[]; insetPx: number }): string | null {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;
    const seen = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) seen.set(entry.target.id, entry.isIntersecting);
        // Document order, not callback order: entries arrive batched and unordered.
        const current = ids.find((id) => seen.get(id) === true);
        if (current !== undefined) setActive(current);
      },
      { rootMargin: `-${insetPx}px 0px -70% 0px`, threshold: 0 },
    );

    for (const id of ids) {
      const element = document.getElementById(id);
      if (element !== null) observer.observe(element);
    }
    return () => {
      observer.disconnect();
    };
  }, [ids, insetPx]);

  return active;
}
