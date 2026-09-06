/**
 * The masthead of a page, in two volumes.
 *
 * ── PORTED FROM `openplate/app/routes/index.tsx`, WHICH IS 1487 LINES AND HAS BEEN THROUGH TWO
 *    OVERHAUL ROUNDS AND A CRITIQUE PASS ──
 * What moved is the SHAPE: a wordmark, a rule under it, one headline, one lead, one filled action
 * with a quieter one beside it, and the product underneath. What did not move is the copy, which on
 * this site comes out of the member repositories through `app/lib/stack-sections.ts` or out of the
 * locale bundle, and the pictures, which come out of `app/lib/shots.ts` in the reader's language.
 * So the two front doors stop disagreeing without either one becoming a copy of the other.
 *
 * What was deliberately left behind: the decorative plate glyph, the brand glow and the tinted
 * shadows. Those are the app's, and they are right there, on a page whose job is to sell. This site
 * is text first, one accent colour, no fills; a glow behind the wordmark here would be the loudest
 * thing on the whole domain and it would be loud on the first screen a reader ever sees.
 *
 * ── TWO VOLUMES, BECAUSE THE THREE COMPONENT PAGES ARE NOT THE FRONT PAGE ──
 * `Hero` is the front page's, centred, with the product under it. `PageHero` is what `/app`,
 * `/sync` and `/inference` carry: the same vocabulary, left aligned, at body sizes, with the
 * component's own icon instead of a screenshot. A reader arrives on those pages already knowing
 * what openplate is, usually from the page this hero opens.
 */
import type { ComponentType, ReactNode } from 'react';

import type { IconProps } from './icons';

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
  title,
  headline,
  lead,
  actions,
  note,
  children,
}: {
  /** The wordmark. It is the page's `h1` and it is the only `h1` on it. */
  title: string;
  /** One sentence saying what the thing is. */
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
    <section>
      {/* The COPY keeps a reading measure even though the shot below it does not. A wide column is
          for a screenshot; a 48rem sentence is a sentence nobody finishes. */}
      <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-primary sm:text-5xl">{title}</h1>
        {/* A short rule under the wordmark: the smallest piece of furniture that turns a heading
            with paragraphs under it into a composed masthead. `aria-hidden`, it says nothing. */}
        <span aria-hidden="true" className="mt-5 block h-1 w-16 rounded-full bg-primary" />
        <p className="mt-6 font-display text-2xl leading-snug tracking-tight sm:text-3xl">{headline}</p>
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
