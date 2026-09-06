/**
 * Every icon this site draws, as inline SVG, vendored path by path.
 *
 * ── NO ICON PACKAGE, ON PURPOSE ──
 * This site ships a few kilobytes of JavaScript to a reader and three files explain why. An icon
 * library is a dependency, a version to keep current and a tree-shaking question, in exchange for
 * four shapes that are each one line of path data. They are copied in here instead, with the source
 * and the licence of every one named below, which is the whole obligation those licences carry.
 *
 * ── PROVENANCE ──
 * `GitHubMark`: @tabler/icons 3.44.0, `icons/filled/brand-github.svg`. MIT, copyright 2020 to 2026
 * Pawel Kuna. Tabler's own drawing of the GitHub mark, not GitHub's file. The GitHub logo is a
 * trademark of GitHub, Inc.; it is used here only to label links that do point at GitHub.
 *
 * `AppIcon`, `SyncIcon`, `InferenceIcon`: lucide 0.475.0, `smartphone`, `refresh-cw` and `cpu`.
 * ISC, copyright Lucide Contributors 2022, with portions from Feather (MIT) copyright Cole Bemis
 * 2013 to 2022. Lucide's grid is 24 square with a 2 unit round stroke, and the three are drawn
 * together so the stack cards read as one set: the diary on a device, the copy that travels between
 * devices, and the machine that does the looking.
 *
 * ── HOW THEY BEHAVE ──
 * Every icon takes a `className` and nothing else. Colour comes from `currentColor`, so an icon
 * inherits the colour of the text it sits next to and needs no colour prop and no theme awareness.
 * Size comes from that class, in `em` where the icon sits in a line of text. They are all
 * `aria-hidden`: each one labels something that already has words, and a screen reader announcing
 * "GitHub image, GitHub" reads the same thing twice.
 */

import type { JSX } from 'react';

import type { DocComponent } from '#app/lib/docs';

/** The one prop, which is the size and the position. Colour is inherited and never passed. */
export interface IconProps {
  className?: string;
}

/** Shared by every icon here: decorative, 24 square, and painted in the surrounding text colour. */
const SVG = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  'aria-hidden': true,
  focusable: false,
} as const;

/** Lucide's drawing settings. An outline set, so the paint is on the stroke and never on the fill. */
const OUTLINE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

export function GitHubMark({ className }: IconProps) {
  return (
    <svg {...SVG} className={className} fill="currentColor">
      <path d="M5.315 2.1c.791 -.113 1.9 .145 3.333 .966l.272 .161l.16 .1l.397 -.083a13.3 13.3 0 0 1 4.59 -.08l.456 .08l.396 .083l.161 -.1c1.385 -.84 2.487 -1.17 3.322 -1.148l.164 .008l.147 .017l.076 .014l.05 .011l.144 .047a1 1 0 0 1 .53 .514a5.2 5.2 0 0 1 .397 2.91l-.047 .267l-.046 .196l.123 .163c.574 .795 .93 1.728 1.03 2.707l.023 .295l.007 .272c0 3.855 -1.659 5.883 -4.644 6.68l-.245 .061l-.132 .029l.014 .161l.008 .157l.004 .365l-.002 .213l-.003 3.834a1 1 0 0 1 -.883 .993l-.117 .007h-6a1 1 0 0 1 -.993 -.883l-.007 -.117v-.734c-1.818 .26 -3.03 -.424 -4.11 -1.878l-.535 -.766c-.28 -.396 -.455 -.579 -.589 -.644l-.048 -.019a1 1 0 0 1 .564 -1.918c.642 .188 1.074 .568 1.57 1.239l.538 .769c.76 1.079 1.36 1.459 2.609 1.191l.001 -.678l-.018 -.168a5.03 5.03 0 0 1 -.021 -.824l.017 -.185l.019 -.12l-.108 -.024c-2.976 -.71 -4.703 -2.573 -4.875 -6.139l-.01 -.31l-.004 -.292a5.6 5.6 0 0 1 .908 -3.051l.152 -.222l.122 -.163l-.045 -.196a5.2 5.2 0 0 1 .145 -2.642l.1 -.282l.106 -.253a1 1 0 0 1 .529 -.514l.144 -.047l.154 -.03z" />
    </svg>
  );
}

/** openplate itself: the diary, which runs on the device in the reader's hand and nowhere else. */
export function AppIcon({ className }: IconProps) {
  return (
    <svg {...SVG} {...OUTLINE} className={className}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

/** openplate-sync: the same encrypted diary arriving on a second device, and the server's whole job. */
export function SyncIcon({ className }: IconProps) {
  return (
    <svg {...SVG} {...OUTLINE} className={className}>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

/** openplate-inference: the model that reads a photograph of a plate, on hardware somebody chose. */
export function InferenceIcon({ className }: IconProps) {
  return (
    <svg {...SVG} {...OUTLINE} className={className}>
      <rect width="16" height="16" x="4" y="4" rx="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

/**
 * The three stack components, by the key the documentation already addresses them with.
 *
 * A record and not three imports at each call site: the stack cards are built from a list, and a
 * lookup keyed by `DocComponent` is what makes a fourth component a compiler error here rather than
 * a card with no icon.
 */
export const STACK_ICONS = {
  app: AppIcon,
  sync: SyncIcon,
  inference: InferenceIcon,
} satisfies Record<DocComponent, (props: IconProps) => JSX.Element>;
