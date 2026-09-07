/**
 * The masthead of a page, in two volumes.
 *
 * ── PORTED FROM `openplate/app/routes/index.tsx`, WHICH IS 1487 LINES AND HAS BEEN THROUGH TWO
 *    OVERHAUL ROUNDS AND A CRITIQUE PASS ──
 * What moved is the SHAPE: one headline, one lead, one filled action with a quieter one beside it,
 * and the product underneath. What did not move is the copy, which on
 * this site comes out of the member repositories through `app/lib/stack-sections.ts` or out of the
 * locale bundle, and the pictures, which come out of `app/lib/shots.ts` in the reader's language.
 * So the two front doors stop disagreeing without either one becoming a copy of the other.
 *
 * What was deliberately left behind: the decorative plate glyph and the tinted shadows. Those are
 * the app's, and they are right there, on a page whose job is to sell. This site is text first, one
 * accent colour, no fills.
 *
 * THE BRAND GLOW WAS ON THAT LIST AND IS NOT ANY MORE. Left out, the front page is a headline on a
 * flat field, and that was a consequence of the move rather than a decision: the designed backdrop
 * belonged to the landing page and stayed behind on the other host. `HeroBackdrop` below brings it
 * back, on the front page's `Hero` alone. It stays quiet, and the two tokens are what keep it
 * quiet: the glow tops out at a fifth of `--primary` and the texture at `--texture-opacity`, which
 * is a tenth in the light theme and less in the dark one. Both are still under the strength of the
 * one filled button above them, so the loudest thing on the first screen is still the way in.
 *
 * ── THE WORDMARK CAME WITH THE SHAPE AND HAS BEEN TAKEN BACK OUT ──
 * `Hero` used to open with a `title`, the word "openplate" set large in the brand colour, and that
 * was the page's `h1`. The site frame prints the same word as the header wordmark about two hundred
 * pixels above it, and on a phone the two sat almost on top of each other: the reader met the name
 * twice before meeting a sentence. The `title` prop is gone and the HEADLINE is now the `h1`, which
 * is also the truer document outline, since a page's one top-level heading should say what the page
 * is about rather than repeat the site's name. It keeps the display face and the tight tracking so
 * it still reads as the top of a composed masthead, one step down from the wordmark it replaces
 * because it is a whole sentence and not one word, and it is NOT set in the brand colour: teal on
 * this site means "the way in", and a sentence is not a door. `PageHero` below is untouched; its
 * `title` is the page's own name, which the header does not print.
 *
 * ── TWO VOLUMES, BECAUSE THE THREE COMPONENT PAGES ARE NOT THE FRONT PAGE ──
 * `Hero` is the front page's, centred, with the product under it. `PageHero` is what `/app`,
 * `/sync` and `/inference` carry: the same vocabulary, left aligned, at body sizes, with the
 * component's own icon instead of a screenshot. A reader arrives on those pages already knowing
 * what openplate is, usually from the page this hero opens.
 */
import type { ComponentType, ReactNode } from 'react';

import type { IconProps } from './icons';
import { FullBleedBackdrop } from './page';

/**
 * The two decorative layers behind the front page's masthead, ported with the rest of the shape.
 *
 * ── FULL BLEED, BECAUSE A GLOW WITH A RIGHT EDGE IS A RECTANGLE ──
 * The marketing column is 72rem and the app's own comment calls this a backdrop behind the whole
 * composition. Stopped at the column it would draw a lit panel with two visible sides, which says
 * the opposite of what a glow is for. `FullBleedBackdrop` in `page.tsx` is how anything on this
 * site leaves the column, and its comment carries the scrollbar guard that goes with it.
 *
 * ── IT STARTS UNDER THE HEADER, NOT BEHIND IT ──
 * The texture is a mask that fades out at the BOTTOM and nowhere else, so its top is a straight
 * horizontal edge wherever it is put. Under the header that edge lands exactly on the header's
 * bottom border, where a rule is already drawn and the seam cannot be seen. Behind the header it
 * would instead tint the chrome that every other page on the site shows untinted, and this is the
 * front page's decoration, not the frame's. `-top-12` is the reach: the page is the first child of
 * a `main` with `py-12`, so three rems up is the border and not a guess.
 *
 * ── TWO ELEMENTS, AND NOT ONE ──
 * `brand-texture` is a mask, and a mask clips the element's children with it. Painting the glow on
 * the same box would put the rings through the glow as well and lose the soft ellipse. So the
 * glow is the outer box and the texture is a full size layer over it, which is also the stacking
 * order the app uses: light first, then the pattern in it.
 */
function HeroBackdrop() {
  return (
    <FullBleedBackdrop className="brand-glow -top-12 bottom-0">
      <div className="brand-texture absolute inset-0" />
    </FullBleedBackdrop>
  );
}

/**
 * The page's one filled action.
 *
 * ONE per page, never two. Two filled buttons side by side are two offers of equal weight, and this
 * site has one thing to offer at a time. The second way out of a hero is `SECONDARY_ACTION` below,
 * which announces itself as a link and stays subordinate.
 *
 * `rounded-full`, because the application's own buttons are pills and this button is a door into
 * it. The height is set by the padding rather than by a fixed `h-`, so it grows with the type if
 * the reader has scaled it up.
 */
export const PRIMARY_ACTION =
  'inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground transition-opacity hover:opacity-90';

/**
 * The quieter half of an action pair.
 *
 * Body size and near full strength text, not a caption: at `text-sm` beside a filled button it read
 * as a note about the button rather than as a second thing to press. The brand is in the underline
 * alone, so teal keeps meaning "the way in" on this page as it does everywhere else on the site.
 */
export const SECONDARY_ACTION =
  'text-base text-foreground underline decoration-primary/40 underline-offset-4 transition-colors hover:decoration-primary';

export function Hero({
  headline,
  lead,
  actions,
  note,
  children,
}: {
  /** One sentence saying what the thing is. It is the page's `h1` and the only `h1` on it. */
  headline: string;
  /** One paragraph saying who it is for. */
  lead: string;
  /** The action pair. */
  actions: ReactNode;
  /**
   * One line under the actions, for the condition attached to pressing one.
   *
   * It sits UNDER the buttons rather than above them because it is reassurance about pressing, not
   * an argument for pressing, and it is the smallest type in the hero for the same reason.
   */
  note?: ReactNode;
  /** The product, under the words. The front page puts `HeroShot` and its example-data note here. */
  children: ReactNode;
}) {
  return (
    // `isolate` is not decoration here: `HeroBackdrop` sits at `-z-10`, and a negative index is
    // measured against the nearest stacking context. Without one on this section the layer would be
    // pushed behind the page's own background and paint nothing.
    <section className="relative isolate">
      <HeroBackdrop />
      {/* The COPY keeps a reading measure even though the shot below it does not. A wide column is
          for a screenshot; a 48rem sentence is a sentence nobody finishes. */}
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        {/* THE SHORT RULE THAT USED TO SIT HERE IS GONE WITH THE WORDMARK IT BELONGED TO. It was
            furniture that bound a one-word heading to the paragraphs under it, and it worked
            because the word above it was a mark rather than a sentence. Above this headline it is a
            teal bar at the very top of the page pointing at nothing; below it, it cuts the sentence
            off from the lead that continues it. A sentence at heading size in the display face
            already reads as the top of a masthead, so the rule has no work left to do. */}
        <h1 className="font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">{headline}</h1>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{lead}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">{actions}</div>
        {note !== undefined && <p className="mt-4 text-sm text-muted-foreground">{note}</p>}
      </div>
      <div className="mt-10 sm:mt-12">{children}</div>
    </section>
  );
}

/**
 * The same masthead at the volume a component page wants.
 *
 * The icon is the component's own, from `icons.tsx`, and it sits on its own line above the title
 * rather than beside it. Beside a 3xl heading a 24 unit lucide grid with a 2 unit stroke is either
 * too heavy or too small; above it, at the muted colour, it labels the page and competes with
 * nothing.
 */
export function PageHero({
  icon: Icon,
  title,
  lead,
}: {
  icon: ComponentType<IconProps>;
  title: string;
  lead: ReactNode;
}) {
  return (
    <section>
      <Icon className="h-6 w-6 text-muted-foreground" />
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {/* The lead keeps a measure, and it is the SAME measure `DocBlocks` gives the quoted
          paragraphs under it. Unconstrained it ran the full 48rem column while every paragraph
          below stopped at 68 characters, so the page had two different right edges and the widest
          line on it was the one nobody had chosen the width of. Fewer characters here because the
          type is a step larger. */}
      <div className="mt-5 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">{lead}</div>
    </section>
  );
}
