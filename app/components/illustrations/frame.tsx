/**
 * What every illustration in this folder shares: its props, its accessibility, and its paint.
 *
 * ── WHY A SHARED FILE AT ALL, WHEN `icons.tsx` NEEDS NONE ──
 * An icon is one path and one class. An illustration is a drawing with parts, and four drawings
 * that each invent their own answer to "am I decorative" and "how thick is a line" stop being a
 * set. Three constants and one function are cheap; four drifting copies are not.
 *
 * ── THE PAINT RULE, WHICH IS THE ONE THAT BREAKS LOUDEST IF BROKEN ──
 * No drawing in this folder names a colour. Every stroke and every fill is `currentColor`, and the
 * colour arrives from a Tailwind text utility on the element or on an ancestor: `text-primary`,
 * `text-muted-foreground`, `text-foreground`, `text-border`. So a drawing follows the palette in
 * `app/app.css`, follows the reader's theme, and follows the theme toggle, without knowing that any
 * of the three exist. A hex value typed here would be a fourth teal, which is the exact failure
 * `openplate-brand` was created to end, and it would be wrong in one of the two themes on top.
 *
 * ── THE SIZE RULE ──
 * A drawing carries a `viewBox` and no `width` or `height`. It fills whatever box the caller gives
 * it, so the caller sizes it with a class and it survives a 360 pixel phone and a 1152 pixel
 * marketing column alike. Every number inside a drawing is a `viewBox` unit, never a pixel.
 *
 * ── THE MOTION RULE, AND THE ONE THING THAT IS EASY TO GET WRONG ──
 * `app/app.css` damps motion globally for a reader who asked for less of it: it forces
 * `animation-duration: 0.01ms` and `animation-iteration-count: 1`. An animation therefore does not
 * freeze mid travel, it runs once instantly and then the element goes back to the state its
 * ordinary CSS gives it, because nothing here sets `animation-fill-mode`.
 *
 * That makes the rule for this folder exact, and every drawing follows it:
 *
 *   **The base rule is the finished picture. The keyframes travel towards it, never away.**
 *
 * A bar that grows is full height in its base rule and starts short in its keyframes. A token that
 * travels an arrow is invisible in its base rule, because a packet parked in a pipe is not a
 * picture of anything. Turn motion off and every drawing here is complete and still true.
 *
 * Two kinds of motion, and the choice is not decorative:
 *   - **loop** for something that keeps happening, which is traffic on an arrow.
 *   - **once** for something that has a finished state, which is a bar or an arc. Looping those
 *     means growing, snapping back to nothing, and growing again, which reads as a broken render.
 *     A one shot plays on the first paint, so a reader who scrolls down to it finds it finished.
 *     That is the correct outcome and it needs no observer and no JavaScript.
 *
 * ── NO DEPENDENCY, SAME POLICY AS `icons.tsx` ──
 * No icon package, no animation library, no SMIL. The CSS lives in a `<style>` element inside each
 * drawing, next to the geometry the numbers in it refer to. Nothing here is copied from lucide or
 * from tabler: these are drawn for this site, so there is no path data to attribute. The four
 * screen drawings are deliberate cousins of `AddIcon`, `ScanIcon`, `GoalsIcon` and `OverviewIcon`
 * in `app/components/icons.tsx`, which stay exactly where they are and keep their own provenance.
 */

/**
 * The two props every drawing here takes.
 *
 * `className` is the size and the position, and usually the colour of the muted parts, since the
 * drawings paint themselves from `currentColor` downwards.
 *
 * `label` is the accessibility decision, and the default is the one that is right nearly every
 * time: these drawings sit beside prose that already says what they say, so a screen reader
 * announcing them says everything twice. Leave `label` off and the drawing is `aria-hidden`. Pass
 * one only where the drawing carries something the words around it do not, which in this folder is
 * `DataFlow`: the three arrows, and which of them the app server is not on, are the page's whole
 * claim, and a reader who cannot see them gets that claim from nowhere else on the page.
 */
export interface IllustrationProps {
  className?: string;
  label?: string;
}

/** The `<svg>` attributes that carry the accessibility decision, so no drawing decides it twice. */
export interface FrameAttributes {
  'aria-hidden'?: true;
  role?: 'img';
  'aria-label'?: string;
}

/** Decorative by default, an image with a name when the caller gives it one. */
export function frameAttributes(label: string | undefined): FrameAttributes {
  if (label === undefined) return { 'aria-hidden': true };
  return { role: 'img', 'aria-label': label };
}

/** On every root `<svg>`: never focusable, and never sized in pixels. */
export const SVG_ROOT = {
  xmlns: 'http://www.w3.org/2000/svg',
  focusable: false,
} as const;

/**
 * The house line: painted on the stroke, never on the fill, with round ends.
 *
 * Stroke WIDTH is not here on purpose. These are drawn on grids of different sizes and a single
 * number would come out hairline on one and heavy on another, so each drawing sets its own on the
 * group and states the ratio it chose.
 */
export const DRAWN = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;
