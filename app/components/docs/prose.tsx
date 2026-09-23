/**
 * The two inline styles running prose shares: the inline code chip and the
 * prose link. The doc pages draw them through `Spans`, and the marketing pages
 * draw the chip through `renderCopy` in `page.tsx`, so one command looks the
 * same on every page a reader meets it on.
 *
 * PORTED FROM collie-website's `src/components/prose.tsx` and
 * `src/lib/chip-hugs.ts`.
 */

/**
 * A link inside doc prose.
 *
 * THE UNDERLINE IS THE TEXT'S OWN INK. collie measured `decoration-border` at
 * 1.16:1 against the page, a rule nobody could see under a link, on pages that
 * are mostly cross-references. Full ink is what a link has always looked like.
 */
export const PROSE_LINK = 'text-foreground underline decoration-foreground underline-offset-4 hover:decoration-current';

/**
 * The punctuation a chip must sit tight against, on each side.
 *
 * THE GAP WAS THE CHIP, NOT THE MARKUP. The DOM is clean, `<code>.env</code>`
 * then `:` with nothing between them, and the padding inside the chip still
 * reads as a typed space before the colon. Padding is what makes the chip a
 * chip, so it goes only where the character beside it is punctuation that
 * belongs to the sentence rather than to the code.
 */
export const HUGS_AFTER = /^[.,:;)!?]/;
export const HUGS_BEFORE = /[(["']$/;

/**
 * Up to this many characters a chip never breaks across two lines. A flag or a
 * short command split at its hyphen reads as two things. 24 monospace
 * characters at the chip's size fit a 320 pixel column with room to spare, so
 * a short chip cannot push the page sideways.
 */
const MAX_UNBROKEN_LENGTH = 24;

/**
 * ── ONE COLOUR DOING THE JOB, NOT TWO GREYS ARGUING ──
 * collie's chip takes its fill, its edge and its ink from one hue, its info
 * blue, at 10%, 20% and full strength. This palette has no second hue to spend:
 * teal is the link colour, and a teal chip would read as a link. So the one
 * colour is the ink itself, `foreground`, at 8% for the fill, 20% for the edge
 * and full strength for the letters. It was `bg-muted` under `border-border`,
 * two unrelated greys, and the edge was the fainter of them.
 *
 * A LONG CHIP WRAPS INSIDE ITSELF. A path wider than a phone column has no
 * break point of its own and would run off the page. `overflow-wrap: anywhere`
 * breaks it, and `box-decoration-clone` gives each line its own edge and
 * padding, so the second line still reads as code.
 */
export function CodeChip({
  text,
  hugBefore = false,
  hugAfter = false,
}: {
  text: string;
  /** Punctuation that belongs to the sentence sits right before the chip. */
  hugBefore?: boolean;
  /** Punctuation that belongs to the sentence sits right after the chip. */
  hugAfter?: boolean;
}) {
  const wrap = text.length <= MAX_UNBROKEN_LENGTH ? 'whitespace-nowrap' : '[overflow-wrap:anywhere]';
  return (
    <code
      className={`box-decoration-clone border border-foreground/20 bg-foreground/8 py-0.5 font-mono text-[0.9em] text-foreground ${wrap} ${hugBefore ? 'pl-0' : 'pl-1'} ${hugAfter ? 'pr-0' : 'pr-1'}`}
    >
      {text}
    </code>
  );
}
