/**
 * The three shapes every content page is built from: a title, a section with a
 * heading, and the row of documentation links a component page ends with.
 *
 * They exist so the pages themselves stay copy plus structure. The site is
 * deliberately text first: one accent color, no cards with colored fills, no
 * borders used as decoration.
 */
import type { ReactNode } from 'react';

/**
 * The copy is written in the same markdown the rest of the project is written
 * in, so a few sentences carry a backticked code span (`/admin`, `lite`). This
 * renders those as `<code>` and leaves the translation strings byte-identical
 * to the reviewed English, which is what keeps the two comparable.
 *
 * Keys are built from the running character offset rather than the array
 * index, so they stay unique and data-dependent.
 */
function renderCopy(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`)/);
  const nodes: ReactNode[] = [];
  let offset = 0;

  for (const part of parts) {
    const key = `s${offset}`;
    offset += part.length;

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      nodes.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]">
          {part.slice(1, -1)}
        </code>,
      );
      continue;
    }

    nodes.push(part);
  }

  return nodes;
}

/**
 * One paragraph of copy, on a reading measure unless the caller names another.
 *
 * `className` REPLACES the measure rather than adding to it, which is how this
 * has always worked and is what `Lead` and the two hero leads rely on: they are
 * a type size up and stop at 60 characters instead. The default matters on the
 * marketing pages, where a paragraph written straight into a 72rem column ran
 * about a hundred characters wide with nothing in the markup asking it to.
 */
export function Copy({ text, className }: { text: string; className?: string }) {
  return <p className={className ?? 'max-w-[68ch]'}>{renderCopy(text)}</p>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h1>;
}

export function Lead({ text }: { text: string }) {
  // The same measure `PageHero` gives its lead, and for the same reason: this
  // type is a step larger than the body, so it holds fewer characters per line
  // before it stops being one paragraph and becomes a wall.
  return <Copy text={text} className="mt-6 max-w-[60ch] text-lg leading-relaxed" />;
}

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
 * ── THE SECTION IS AS WIDE AS THE PAGE, ITS PARAGRAPHS ARE NOT ──
 * A marketing page is 72rem so that a grid of screenshots and a row of cards
 * get room. A sentence does not want that room: a paragraph 1152 pixels wide is
 * one the eye loses its place in on the way back to the left edge. So a
 * paragraph written straight into a section is capped here, in the one place
 * that owns the scale, rather than by a `max-w` typed onto each page. The
 * quoted paragraphs `DocBlocks` renders already carry the same cap, and a grid,
 * a card or a picture is not a `<p>` and keeps the width it was given.
 */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{heading}</h2>
      <div className="mt-4 space-y-4 leading-relaxed [&>p]:max-w-[68ch]">{children}</div>
    </section>
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
