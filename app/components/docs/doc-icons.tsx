/**
 * The three icons only the documentation draws: copy, copied and search.
 *
 * They live here and not in `app/components/icons.tsx` so a docs change never edits the file every
 * page imports. They follow its rules exactly: decorative, 24 square, painted in `currentColor`,
 * sized by the caller's class.
 *
 * ── PROVENANCE ──
 * lucide 0.475.0, `copy`, `check` and `search`, taken from
 * `lucide-react@0.475.0/dist/esm/icons/<name>.js`. ISC, copyright Lucide Contributors 2022, with
 * portions from Feather (MIT) copyright Cole Bemis 2013 to 2022.
 */
import type { IconProps } from '#app/components/icons';

const SVG = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function CopyIcon({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg {...SVG} className={className}>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
