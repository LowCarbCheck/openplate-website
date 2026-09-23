/**
 * The three shapes every content page is built from: a title, a section with a
 * heading, and the row of documentation links a component page ends with.
 *
 * They exist so the pages themselves stay copy plus structure. The site is
 * deliberately text first: one accent color, no cards with colored fills, no
 * borders used as decoration.
 */
import type { ComponentType, ReactNode } from 'react';

import { CodeChip, HUGS_AFTER, HUGS_BEFORE } from './docs/prose';
import type { IconProps } from './icons';
import { SiteLink } from './site-link';

/**
 * The copy is written in the same markdown the rest of the project is written
 * in, so a few sentences carry a backticked code span (`/admin`, `lite`). This
 * renders those as the docs' own `CodeChip` and leaves the translation strings
 * byte-identical to the reviewed English, which is what keeps the two
 * comparable. The text on either side is a plain string, so the chip hugs its
 * punctuation here exactly as it does in `DocBlocks`.
 *
 * Keys are built from the running character offset rather than the array
 * index, so they stay unique and data-dependent.
 */
function renderCopy(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/);
  const nodes: ReactNode[] = [];
  let offset = 0;

  for (const [i, part] of parts.entries()) {
    const key = `s${offset}`;
    offset += part.length;

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <CodeChip
          key={key}
          text={part.slice(1, -1)}
          hugBefore={HUGS_BEFORE.test(parts[i - 1] ?? '')}
          hugAfter={HUGS_AFTER.test(parts[i + 1] ?? '')}
        />,
      );
      continue;
    }

    nodes.push(part);
  }

  return nodes;
}

/**
 * One paragraph of copy, on a reading measure and in the prose face unless the caller names another.
 *
 * `className` REPLACES the measure rather than adding to it, which is how this
 * has always worked and is what `Lead` and the two hero leads rely on: they are
 * a type size up and stop at 60 characters instead. The default matters on the
 * marketing pages, where a paragraph written straight into a 72rem column ran
 * about a hundred characters wide with nothing in the markup asking it to.
 *
 * The same goes for the face: a paragraph is running copy and reads in Inter (`font-prose`), and
 * `PageHero`'s lead is the one caller that replaces the class and pins the body's monospace on its own.
 */
export function Copy({ text, className }: { text: string; className?: string }) {
  return <p className={className ?? 'max-w-[68ch] font-prose'}>{renderCopy(text)}</p>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{children}</h1>;
}

export function Lead({ text }: { text: string }) {
  // The same measure `PageHero` gives its lead, and for the same reason: this
  // type is a step larger than the body, so it holds fewer characters per line
  // before it stops being one paragraph and becomes a wall.
  return <Copy text={text} className="mt-6 max-w-[60ch] font-prose text-lg leading-relaxed" />;
}

/**
 * The reading column of a marketing page: 42rem, centred, text left aligned.
 *
 * `max-w-2xl` is also the width of the front page hero's words, so every page's text sits in one
 * column. `Section` repeats the number in its child selectors, which Tailwind can only read as
 * whole class names. Change both.
 */
export const MEASURE = 'mx-auto w-full max-w-2xl';

/**
 * One section: the site's own heading, and whatever goes under it.
 *
 * THE HEADING IS SIZED LIKE A DOCUMENT'S `##`, and that is not decoration. Most
 * of what sits under one of these headings now comes out of the member
 * repositories through `app/lib/stack-sections.ts`, and a quoted section brings
 * its own subheadings with it, drawn by `DocBlocks` on the documentation pages'
 * scale. At the size this heading used to be, an upstream `###` inside a section
 * was exactly as large as the site heading above it, so the page looked like a
 * flat list of sections rather than two of them with subsections. One step up
 * puts the site's frame above the quoted words instead of level with them.
 *
 * ── THE SECTION IS AS WIDE AS THE PAGE, ITS WORDS ARE NOT ──
 * A marketing page is 72rem so that a grid of screenshots and a row of cards get room. A sentence
 * does not want that room, so the heading and every text block in a section share one measure,
 * `MEASURE` above, CENTRED in the column. On the column's left edge it left a third of every page
 * empty on the right, under a front page hero that is centred. The box is centred; the words in it
 * stay left aligned.
 *
 * One rem width and not a `ch` cap each: the heading is monospace at 2xl and a paragraph is Inter
 * at the body size, so two `ch` caps would give them two left edges. It overrides the `68ch` that
 * `DocBlocks` puts on a quoted paragraph, list, fence or callout for the same reason. A `.grid`, a
 * table, a figure or any `div` is not in the list and keeps the full width.
 *
 * A paragraph written straight into a section also takes the prose face here. Headings, cards and
 * tables under it keep the body's monospace.
 *
 * ── `isWide`, FOR A SECTION THAT IS ONE FULL WIDTH GRID ──
 * A heading aligns with what it heads. A prose section uses `MEASURE`; a section whose content is a
 * full width grid puts its heading on the column's own left edge, the grid's edge. Centred over a
 * grid it floated about 220 pixels in from the cards it names. A section that mixes a paragraph and
 * a grid stays centred, because the heading heads the paragraph first.
 *
 * `className` is for the `<section>` itself, which is how `/research` puts `.reveal` on one.
 */
export function Section({
  heading,
  isWide = false,
  className,
  children,
}: {
  heading: string;
  isWide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`mt-12 ${className ?? ''}`}>
      <h2 className={`${isWide ? '' : MEASURE} text-2xl font-semibold tracking-tight text-balance`}>{heading}</h2>
      <div className="mt-4 space-y-4 leading-relaxed [&>:is(p,h3,h4,ul,ol,pre,blockquote):not(.grid)]:mx-auto [&>:is(p,h3,h4,ul,ol,pre,blockquote):not(.grid)]:max-w-2xl [&>p]:font-prose">
        {children}
      </div>
    </section>
  );
}

/**
 * A 40 pixel square with a 20 pixel icon, the same on a card, a tile and a section heading.
 *
 * It started on `/research` and moved here when `/sources`, `/app` and the front page wanted the
 * same tile: one border, the muted surface and the icon in the foreground colour, never in teal.
 */
export function IconTile({ icon: TileIcon }: { icon: ComponentType<IconProps> }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted text-foreground">
      <TileIcon className="size-5" />
    </span>
  );
}

/**
 * A link to another page of this site on a line of its own, with the arrow the front page's
 * research badge uses.
 *
 * The arrow sits OUTSIDE the link, so the underline stops at the words, and it is joined to them
 * by a non-breaking space, so a line that has to break never leaves the arrow alone on the next
 * one. `className` is for the wrapper: a prose section passes `MEASURE`, because a `div` is not
 * one of the elements `Section` centres on its own.
 */
export function PageLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  return (
    <div className={`text-sm ${className ?? ''}`}>
      <SiteLink to={to}>{children}</SiteLink>
      <span aria-hidden="true" className="text-primary">
        {'\u00a0→'}
      </span>
    </div>
  );
}

/** A labelled row of links, used for the documentation and release links at the foot of a page. */
export function LinkRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{label}: </span>
      {children}
    </p>
  );
}

/**
 * A block that steps out of the reading column and takes the window.
 *
 * ── FOR DRAWINGS, AND FOR NOTHING ELSE ──
 * This site's measure is 48rem because that is how wide a sentence can be and still be read. A
 * DRAWING has the opposite requirement: the topology diagram is 1728px of flowchart at its natural
 * size, and inside the reading column it renders at about 640px, which is a 2.7x reduction and
 * puts its labels at roughly six pixels. It was legible in the source and unreadable on the page,
 * which is the exact defect a picture is supposed to fix rather than cause.
 *
 * ── THE TRICK, AND THE GUARD ──
 * `left-1/2` plus `-translate-x-1/2` re-centres the block on the viewport instead of on its parent,
 * and `w-screen` gives it the window. `100vw` INCLUDES the vertical scrollbar in most browsers, so
 * this element is a few pixels wider than the document and would produce a horizontal scrollbar on
 * a page nobody has scrolled sideways in. `SiteLayout` carries `overflow-x-clip` for that, and it
 * clips horizontally only, so vertical scrolling is untouched. The two are deliberate together:
 * either one alone is a single point of failure for a bug with no symptom until somebody drags.
 *
 * The padding is the page's own, so the block lines up with the column above it at the point where
 * the window is narrower than the column plus its margins.
 */
export function FullWidth({ children }: { children: ReactNode }) {
  return <div className="relative left-1/2 w-screen max-w-[96rem] -translate-x-1/2 px-5">{children}</div>;
}

/**
 * The same step out of the column, for a decorative layer that must not take up space.
 *
 * ── WHY IT IS NOT `FullWidth` ──
 * `FullWidth` is a block in the flow: it is `relative`, so it pushes the page down by its own
 * height, and it caps at 96rem and keeps the page gutter because a DRAWING wants a readable size
 * and an alignment. A backdrop wants neither. It has to sit under content that is already laid
 * out, so it is `absolute` and takes its height from the section it belongs to, and it has to
 * reach the window edge, so it carries no cap and no padding. Everything horizontal is the same
 * trick and is the same three classes: `left-1/2` re-centres on the viewport, `-translate-x-1/2`
 * pulls it back by half its own width, `w-screen` gives it the window.
 *
 * ── THE SAME GUARD ──
 * `100vw` includes the vertical scrollbar, so this element is a few pixels wider than the
 * document and would produce a horizontal scrollbar on its own. `SiteLayout` carries
 * `overflow-x-clip` for that and clips horizontally only. Read its comment and `FullWidth`'s
 * above; the three are one decision.
 *
 * ── DECORATION, AND THE PAGE HAS TO SURVIVE WITHOUT IT ──
 * `aria-hidden` because it says nothing, `pointer-events-none` because a layer over a button
 * eats the press, and `-z-10` because it belongs under the words. The negative index needs a
 * stacking context to be measured against, so the caller's section carries `isolate`; without it
 * the layer would be pushed behind the page background and disappear.
 *
 * `className` names the vertical span, which only the caller knows, and may carry the first paint
 * layer with it. It comes last, so a caller can override anything above.
 */
export function FullBleedBackdrop({ className, children }: { className: string; children?: ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute left-1/2 -z-10 w-screen -translate-x-1/2 ${className}`}
    >
      {children}
    </div>
  );
}
