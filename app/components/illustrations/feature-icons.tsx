/**
 * The four screens the front page shows, drawn large enough to be a picture rather than a bullet.
 *
 * ── THESE DO NOT REPLACE `icons.tsx`, THEY ARE ITS BIGGER COUSINS ──
 * `AddIcon`, `ScanIcon`, `GoalsIcon` and `OverviewIcon` are lucide shapes on a 24 unit grid with a
 * 2 unit stroke, and they stay exactly where they are: at 20 pixels beside a heading, a plus in a
 * circle is the right amount of drawing and anything more is mud. These are for the other job, a
 * card or a column where there is room for a picture, so they are drawn on a 64 unit grid with a
 * 2.5 unit stroke. The ratio is deliberately finer than lucide's 12:1, because a scaled up icon
 * looks like a scaled up icon: at 25:1 the line stays a line at 128 pixels and the extra room buys
 * detail instead of thickness.
 *
 * The MOTIF is kept from the small ones, so the two sets read as one family: a plus badge for add,
 * a frame with corner brackets for scan, concentric rings for goals, and a panel of blocks for the
 * day. A reader who saw the icon and then the illustration should see the same idea twice.
 *
 * ── HOW SMALL THEY GO, WHICH IS THE OTHER HALF OF THE SAME DECISION ──
 * About 56 pixels. Below that the plate loses its food and the plus badge closes up, which is not a
 * bug to fix here: it is the size at which `AddIcon` and its three neighbours in `icons.tsx` are
 * the right drawing. Use those there. These are for 64 pixels and up, and they still improve at 128.
 *
 * ── NO TEXT, WHICH IS WHY THESE TAKE NO TEXT PROPS ──
 * Every other drawing in this folder takes its words as required props, because English baked into
 * a drawing is wrong on the German and French halves of this site. These four contain no words at
 * all: they sit under a heading and beside a sentence that already name the screen, in the
 * reader's language, out of the locale bundle. Inventing a caption for them here would be
 * inventing English copy in a component, which is the thing that rule exists to stop.
 *
 * They still take the optional `label`, for the same reason everything here does, but the default
 * is right: `FeatureGrid` prints a title and a sentence beside each one.
 *
 * ── MOTION ──
 * Two of these loop and two run once, and the split is the rule in `frame.tsx`. Adding a meal and
 * scanning a plate are things that keep happening, so the plus breathes and the scan sweeps. A
 * goal ring and a day's bars have a finished state, so they draw themselves in once, on the first
 * paint, and stay. Growth that loops would empty itself and refill every few seconds, which reads
 * as a page still loading. The staggering of the bars is written into the keyframes rather than
 * into `animation-delay` on purpose: a delayed animation with no fill mode shows the finished bar,
 * then snaps it to nothing when it starts.
 */
import type { JSX } from 'react';

import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';
import type { ShotView } from '#app/lib/shots';

/**
 * The four screens with a card on the front page. The hero's own screen, the diary, is not one:
 * it is the picture at the top of the page and it needs no second drawing.
 *
 * Written as an `Extract` from `ShotView` rather than as four fresh string literals, so renaming a
 * capture upstream fails HERE, at compile time, instead of leaving a card with the wrong drawing.
 */
export type FeatureScreen = Extract<ShotView, 'add' | 'scan' | 'goals' | 'overview'>;

/** Every drawing here is 64 square, so the frame is written once. */
const BOX = { viewBox: '0 0 64 64' } as const;

/** The house line at this size. See the header for why 25:1 and not lucide's 12:1. */
const LINE = { ...DRAWN, strokeWidth: 2.5 } as const;

const ADD_MOTION = `
.op-fi-badge { transform-box: fill-box; transform-origin: center; }
.op-fi-badge-pulse { animation: op-fi-badge-pulse 3.4s ease-in-out infinite; }
@keyframes op-fi-badge-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
`;

/**
 * Add a meal: a plate with food on it and one plus.
 *
 * Top down and not in profile, because that is how the app's own plate glyph and every one of its
 * captures shows a meal, and because a bowl in profile with a plus beside it reads as a recipe.
 */
export function AddIllustration({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{ADD_MOTION}</style>
      <g className="text-foreground" {...LINE}>
        <circle cx="28" cy="36" r="21" />
      </g>
      <g className="text-muted-foreground" {...LINE} strokeWidth={2}>
        <circle cx="28" cy="36" r="14" />
        <PlateFood />
      </g>
      <g className="op-fi-badge op-fi-badge-pulse text-primary" {...LINE}>
        <circle cx="50" cy="16" r="11" />
        <path d="M44 16 H56" />
        <path d="M50 10 V22" />
      </g>
    </svg>
  );
}

const SCAN_MOTION = `
.op-fi-sweep { opacity: 0; }
.op-fi-sweep-run { animation: op-fi-sweep-run 3.6s ease-in-out infinite; }
@keyframes op-fi-sweep-run {
  0% { transform: translateY(0); opacity: 0; }
  15% { opacity: 0.7; }
  70% { opacity: 0.7; }
  100% { transform: translateY(32px); opacity: 0; }
}
`;

/**
 * Scan a plate: the camera's four corners, a plate inside them, and a line that passes over it.
 *
 * The sweep is the one part of this set that could be read as a claim, so it is worth being exact:
 * it is a picture of the browser looking at the photo, and the photo goes from the browser to the
 * endpoint the reader configured. Nothing in this drawing is a server, which is the correct number
 * of servers to draw on the path.
 */
export function ScanIllustration({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{SCAN_MOTION}</style>
      <g className="text-foreground" {...LINE}>
        <path d="M8 20 V12 a4 4 0 0 1 4 -4 H20" />
        <path d="M44 8 H52 a4 4 0 0 1 4 4 V20" />
        <path d="M56 44 V52 a4 4 0 0 1 -4 4 H44" />
        <path d="M20 56 H12 a4 4 0 0 1 -4 -4 V44" />
      </g>
      <g className="text-muted-foreground" {...LINE} strokeWidth={2}>
        <circle cx="32" cy="32" r="15" />
        <g transform="translate(4 -4)">
          <PlateFood />
        </g>
      </g>
      <g className="op-fi-sweep op-fi-sweep-run text-primary" {...LINE}>
        <path d="M17 16 H47" />
      </g>
    </svg>
  );
}

const GOALS_MOTION = `
.op-fi-arc { stroke-dashoffset: 0; }
.op-fi-arc-draw { animation: op-fi-arc-draw 1100ms ease-out; }
@keyframes op-fi-arc-draw {
  from { stroke-dashoffset: 99; }
  to { stroke-dashoffset: 0; }
}
`;

/**
 * Set goals: the rings from the small icon, with the outer one carrying a day's progress.
 *
 * The arc is 99 units of a 138 unit circumference, so it stops at about seven tenths and not at
 * the top. A ring closed all the way round is a picture of a day that ended, and the app's own ring
 * is a progress indicator: the gap is the drawing's honesty and the two numbers in the keyframes
 * are the same 99.
 */
export function GoalsIllustration({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{GOALS_MOTION}</style>
      <g className="text-muted-foreground" {...LINE} strokeWidth={2}>
        <circle cx="32" cy="32" r="22" opacity="0.35" />
        <circle cx="32" cy="32" r="13" />
        <circle cx="32" cy="32" r="4" />
      </g>
      <g className="op-fi-arc op-fi-arc-draw text-primary" {...LINE}>
        <circle
          cx="32"
          cy="32"
          r="22"
          strokeDasharray="99 139"
          transform="rotate(-90 32 32)"
          strokeWidth={3}
        />
      </g>
    </svg>
  );
}

const OVERVIEW_MOTION = `
.op-fi-bar { transform-box: fill-box; transform-origin: bottom; }
.op-fi-bar-1 { animation: op-fi-bar-1 1200ms ease-out; }
.op-fi-bar-2 { animation: op-fi-bar-2 1200ms ease-out; }
.op-fi-bar-3 { animation: op-fi-bar-3 1200ms ease-out; }
.op-fi-bar-4 { animation: op-fi-bar-4 1200ms ease-out; }
@keyframes op-fi-bar-1 {
  0%, 10% { transform: scaleY(0.04); }
  60%, 100% { transform: scaleY(1); }
}
@keyframes op-fi-bar-2 {
  0%, 25% { transform: scaleY(0.04); }
  75%, 100% { transform: scaleY(1); }
}
@keyframes op-fi-bar-3 {
  0%, 40% { transform: scaleY(0.04); }
  90%, 100% { transform: scaleY(1); }
}
@keyframes op-fi-bar-4 {
  0%, 55% { transform: scaleY(0.04); }
  100% { transform: scaleY(1); }
}
`;

/**
 * See the day: the panel from the small icon, with the blocks turned into a day's four numbers.
 *
 * Four bars and no scale, no axis and no number. It is a picture of a summary, not a chart of
 * anything: a drawn axis invites a reader to read values off it, and there are none here to read.
 */
export function OverviewIllustration({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{OVERVIEW_MOTION}</style>
      <g className="text-foreground" {...LINE}>
        <rect x="7" y="9" width="50" height="46" rx="7" />
      </g>
      <g className="text-muted-foreground" {...LINE} strokeWidth={2}>
        <path d="M14 18 H30" />
        <path d="M14 47 H50" />
      </g>
      <g className="text-primary">
        <Bar className="op-fi-bar op-fi-bar-1" x={15} height={10} />
        <Bar className="op-fi-bar op-fi-bar-2" x={25} height={19} />
        <Bar className="op-fi-bar op-fi-bar-3" x={35} height={13} />
        <Bar className="op-fi-bar op-fi-bar-4" x={45} height={22} />
      </g>
    </svg>
  );
}

/**
 * What is on the plate, in both drawings that have one, so the two share a meal as well as a grid.
 *
 * TWO OVERLAPPING SHAPES, AND THE OVERLAP IS THE POINT. The first draft was a circle and two short
 * strokes, evenly spaced inside the rim, and at 128 pixels it was unmistakably a face: two eyes and
 * a mouth. Separate shapes arranged symmetrically inside a circle will always do that. Shapes that
 * touch cannot, and food on a plate touches.
 */
function PlateFood() {
  return (
    <g>
      <ellipse cx="26" cy="39" rx="7.5" ry="5" transform="rotate(-14 26 39)" />
      <ellipse cx="33" cy="31" rx="5" ry="4" />
    </g>
  );
}

/** One column of the day panel. It stands ON the 47 line, so every bar grows from the same floor. */
function Bar({ className, x, height }: { className: string; x: number; height: number }) {
  return <rect className={className} x={x} y={45 - height} width="5" height={height} rx="2" fill="currentColor" />;
}

/**
 * The four, by the same key `app/lib/shots.ts` addresses their captures with.
 *
 * A record and not four imports at the call site, for the reason `STACK_ICONS` gives: the feature
 * grid is built from a list, and a lookup keyed by the screen is what makes a fifth card a
 * compiler error here rather than a card with no drawing.
 */
export const FEATURE_ILLUSTRATIONS = {
  add: AddIllustration,
  scan: ScanIllustration,
  goals: GoalsIllustration,
  overview: OverviewIllustration,
} satisfies Record<FeatureScreen, (props: IllustrationProps) => JSX.Element>;
