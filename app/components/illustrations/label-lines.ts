/**
 * A drawing's label on one line or two, broken at the space nearest its middle.
 *
 * ── WHY A DRAWING NEEDS THIS AT ALL ──
 * SVG text does not wrap, and the labels arrive in six languages. "Food database" is thirteen
 * characters and "Base de données alimentaire" is twenty seven, and both have to fit the same
 * column of a drawing that is read on a 390 pixel phone at 13 pixels or more. Two balanced lines
 * fit where one long one runs into the next box. A label with no space in it, such as
 * "Lebensmitteldatenbank", stays on one line, so the column it sits in has to hold about 21
 * characters: the drawings that use this are measured against that word.
 *
 * Pure and in a `.ts` file on purpose: it is tested on its own, and it is not a drawing, so it
 * stays out of the per drawing checks in `tests/unit/illustrations.test.ts`.
 */
export function splitLabel({ text, maxLineLength }: { text: string; maxLineLength: number }): readonly string[] {
  if (text.length <= maxLineLength) return [text];

  const middle = text.length / 2;
  const spaces = [...text.matchAll(/ /g)].map((match) => match.index);
  const nearest = spaces.toSorted((left, right) => Math.abs(left - middle) - Math.abs(right - middle))[0];
  if (nearest === undefined) return [text];

  return [text.slice(0, nearest), text.slice(nearest + 1)];
}
