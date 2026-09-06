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

/** One paragraph of copy. */
export function Copy({ text, className }: { text: string; className?: string }) {
  return <p className={className}>{renderCopy(text)}</p>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{children}</h1>;
}

export function Lead({ text }: { text: string }) {
  return <Copy text={text} className="mt-6 text-lg leading-relaxed" />;
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
 */
export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-semibold tracking-tight">{heading}</h2>
      <div className="mt-4 space-y-4 leading-relaxed">{children}</div>
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
