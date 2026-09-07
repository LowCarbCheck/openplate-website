/**
 * Render the doc tree that `sync-docs` produced.
 *
 * Components, not `dangerouslySetInnerHTML`. The text is quoted from READMEs we
 * control, so the injection risk is small — but small is not the reason to
 * avoid it. Rendering the tree means the doc text arrives in this page's own
 * type, colour and spacing rather than carrying a second stylesheet in with it,
 * and it means the site can never render markup it did not itself build.
 *
 * PORTED FROM collie-website's `src/components/doc-blocks.tsx`. The block model
 * and every decision about it are collie's. What changed: the classes name this
 * site's tokens, an internal link is localised before it is routed, and there is
 * no syntax highlighter here, so a fence is a fence. collie's one exception, the
 * mermaid renderer it loads into the browser, is not here either: this site
 * draws its diagrams at sync time and commits them, so the diagram block is two
 * committed SVG files and a <picture>, and no reader downloads a renderer.
 */
import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useLanguage } from '#app/i18n/use-language';
import { localizePath } from '#app/i18n/language';
import { type Block, type Inline, spansText } from '#app/lib/docs';

/**
 * The punctuation a chip must sit tight against, on each side.
 *
 * THE GAP WAS THE CHIP, NOT THE MARKUP. The DOM is clean —
 * `<code>.env</code><span>:</span>` with nothing between them — and the padding
 * inside the chip still reads as a typed space before the colon. Padding is
 * what makes the chip a chip, so it goes only where the character beside it is
 * punctuation that belongs to the sentence rather than to the code.
 */
const HUGS_AFTER = /^[.,:;)!?]/;
const HUGS_BEFORE = /[(["']$/;

export function Spans({ spans }: { spans: Inline[] }) {
  const language = useLanguage();

  return (
    <>
      {spans.map((span, i) => {
        const key = `${span.kind}-${i}`;
        if (span.kind === 'strong') {
          return (
            <strong key={key} className="font-semibold text-foreground">
              <Spans spans={span.spans} />
            </strong>
          );
        }
        if (span.kind === 'em') {
          return (
            <em key={key} className="italic">
              <Spans spans={span.spans} />
            </em>
          );
        }
        if (span.kind === 'code') {
          // A CHIP, NOT A SECOND VOICE OF THE PROSE. A `code` run reads as
          // quieter than the sentence carrying it, and it is told apart by its
          // edge and its face, not by weight of ink.
          const next = spans[i + 1];
          const previous = spans[i - 1];
          const before = previous?.kind === 'text' && HUGS_BEFORE.test(previous.text);
          const after = next?.kind === 'text' && HUGS_AFTER.test(next.text);
          return (
            <code
              key={key}
              className={`rounded-sm border border-border bg-card py-0.5 font-mono text-[0.9em] text-muted-foreground ${before ? 'pl-0' : 'pl-1'} ${after ? 'pr-0' : 'pr-1'}`}
            >
              {span.text}
            </code>
          );
        }
        if (span.kind === 'link') {
          const style = 'text-foreground underline decoration-foreground underline-offset-4 hover:decoration-current';
          // NOT EVERY LINK LEAVES. The sync rewrites a link to a doc this site
          // publishes into that page's route, so those are routed rather than
          // followed — through an <a> they would reload the whole app to get
          // somewhere it already has. The generated href is the canonical
          // English-rooted path, so a German reader's link is localised here
          // and in no other place.
          if (span.href.startsWith('/')) {
            return (
              <Link key={key} to={localizePath(span.href, language)} className={style}>
                <Spans spans={span.spans} />
              </Link>
            );
          }
          if (span.href.startsWith('#')) {
            return (
              <a key={key} href={span.href} className={style}>
                <Spans spans={span.spans} />
              </a>
            );
          }
          return (
            <a key={key} href={span.href} target="_blank" rel="noreferrer" className={style}>
              <Spans spans={span.spans} />
            </a>
          );
        }
        return <span key={key}>{span.text}</span>;
      })}
    </>
  );
}

type DiagramBlock = Extract<Block, { kind: 'diagram' }>;

/**
 * One diagram, and on a phone a button that gives its size back.
 *
 * ALREADY DRAWN, FOUR TIMES, AND COMMITTED. `sync:docs` renders the fence with
 * a headless browser and writes a light copy and a dark one for each language
 * the site publishes: an SVG has its colours baked in and this site's two
 * appearances are a media query, and it has its words baked in too, which is
 * why the language is in the name rather than in a stylesheet. <picture> picks
 * the appearance, the URL picks the language: no JavaScript, no swap after
 * paint, and nothing here imports mermaid.
 *
 * The description is the <img> alt and not a caption. A caption repeats to a
 * sighted reader what the drawing beside it already says; alt is what a reader
 * who gets no drawing is given instead. The fence itself stays on the page
 * behind a disclosure, so whoever wants the thing that made the picture can
 * copy it.
 *
 * ── THE PICTURE FITS THE COLUMN, AND THE SIZE IS OFFERED RATHER THAN IMPOSED ──
 * This block used to force `min-w-[40rem]` on the image, on the argument that a
 * flowchart has a smallest legible size and a phone column is narrower than it,
 * so the reader should drag the picture the way the code fences already scroll.
 * Measured at 390px that argument fails twice. The reader is shown about a
 * third of the drawing with nothing on screen saying the rest exists, and every
 * diagram in the document does it, so the page reads as broken layout rather
 * than as one deliberately wide figure.
 *
 * Fitting to the column is therefore the default: shrunken is still enough to
 * see what the drawing is about and where in the argument it sits. Full size is
 * a button under it, so the reader asks for the drag instead of inheriting it.
 * The button is the only reason this is a component with state rather than a
 * case in the switch, because the toggle belongs to one figure and a page
 * carries several. It is hidden from `sm` up, where the column is already wider
 * than the drawing and the old floor never bit, so nothing changes there.
 * Closed is the server render, so a reader with no JavaScript gets the fitted
 * picture and loses only the zoom.
 *
 * The label names the NEXT action rather than the current state. That is a
 * claim this component can make accurately on its own, which `aria-pressed`
 * beside a changing label could not.
 */
function DiagramFigure({ block }: { block: DiagramBlock }) {
  const { t } = useTranslation('docs');
  // THE DIAGRAM FILES ARE PER LANGUAGE, so this figure has to say which one it
  // is. The labels inside a drawing are translated at sync time and baked into
  // the SVG, so picking the file is the whole of the client's part in it: there
  // is one committed pair of files per language and the reader gets the pair
  // that matches the words around it.
  const language = useLanguage();
  const [isFullSize, setIsFullSize] = useState(false);

  const quiet = 'cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground';

  return (
    <figure className="mt-5">
      <div className="overflow-x-auto rounded-sm border border-border bg-card p-4">
        <picture>
          <source
            srcSet={`/docs/diagrams/${block.id}-${language}-dark.svg`}
            media="(prefers-color-scheme: dark)"
            type="image/svg+xml"
          />
          <img
            src={`/docs/diagrams/${block.id}-${language}-light.svg`}
            alt={spansText(block.alt)}
            loading="lazy"
            className={isFullSize ? 'w-full min-w-[40rem]' : 'w-full'}
          />
        </picture>
      </div>
      {/* `py-3` ON THE BUTTON, NOT ON `quiet`. `quiet` is shared with the disclosure's `<summary>`
          below, which was never measured as a defect, so the padding that takes this button to a 44
          pixel tall touch target belongs to the button alone. A fixed height would do the same for
          this one line of text and then stop matching a longer translation. */}
      <button type="button" onClick={() => setIsFullSize(!isFullSize)} className={`mt-2 py-3 sm:hidden ${quiet}`}>
        {isFullSize ? t('diagramZoomOut') : t('diagramZoomIn')}
      </button>
      <details className="mt-2">
        <summary className={quiet}>{t('diagramSource')}</summary>
        <pre className="mt-2 overflow-x-auto rounded-sm border border-border bg-muted p-4 font-mono text-[0.8125rem] leading-relaxed">
          <code className="language-mermaid">{block.source}</code>
        </pre>
      </details>
    </figure>
  );
}

export function DocBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        const key = `${block.kind}-${i}`;
        switch (block.kind) {
          case 'heading': {
            // THE LEVEL IS THE DOCUMENT'S, not a fixed h3. A whole doc file has
            // two and sometimes three levels, and flattening them tells a screen
            // reader that a sub-step is a sibling of the section it belongs to.
            const Tag =
              block.level <= 2 ? 'h2'
              : block.level === 3 ? 'h3'
              : 'h4';
            const size =
              block.level <= 2 ? 'mt-14 text-2xl tracking-[-0.01em]'
              : block.level === 3 ? 'mt-10 text-xl'
              : 'mt-8 text-base';
            return (
              <Tag key={key} id={block.id} className={`scroll-mt-20 font-display font-semibold first:mt-0 ${size}`}>
                {/* SPANS, NOT THE FLAT STRING. These headings carry inline code,
                    and `block.text` would put the backticks on the page. The flat
                    form is still the right thing for the anchor and the rail. */}
                <Spans spans={block.spans} />
              </Tag>
            );
          }
          case 'paragraph': {
            return (
              <p key={key} className="mt-5 max-w-[68ch] leading-relaxed">
                <Spans spans={block.spans} />
              </p>
            );
          }
          case 'list': {
            const List = block.ordered ? 'ol' : 'ul';
            // Blocks that sit UNDER an item — the command a step ends by telling
            // you to run. They arrive beside the items rather than inside them.
            const under = new Map((block.nested ?? []).map((entry) => [entry.item, entry.blocks]));
            return (
              <List key={key} className="mt-5 max-w-[68ch] space-y-2 border-t border-border pt-4">
                {block.items.map((item, j) => (
                  // The key is the item's POSITION, and here that is the stable
                  // identity. This tree is generated at sync time and never
                  // mutated in the browser: no item is inserted, removed or
                  // reordered while the page is open, so there is nothing for a
                  // content-derived key to survive that a positional one does
                  // not. The same holds for the table cells below.
                  // oxlint-disable-next-line react/no-array-index-key -- an immutable generated tree, see above
                  <li key={`item-${j}`} className="grid grid-cols-[1.5rem_1fr] items-baseline leading-relaxed">
                    <span aria-hidden="true" className="font-mono text-sm text-muted-foreground">
                      {block.ordered ? String(j + 1).padStart(2, '0') : '—'}
                    </span>
                    <div>
                      <Spans spans={item} />
                      {/* In the SAME grid cell as the item's text, so a fence
                          under step 3 keeps the step's left edge instead of
                          escaping to the page margin. */}
                      {under.has(j) && <DocBlocks blocks={under.get(j) ?? []} />}
                    </div>
                  </li>
                ))}
              </List>
            );
          }
          case 'code': {
            return (
              <Fragment key={key}>
                <pre className="mt-5 overflow-x-auto rounded-sm border border-border bg-muted p-4 font-mono text-[0.8125rem] leading-relaxed">
                  {/* The language is on the <code>, not just used by it.
                      `class="language-bash"` is what a reader's view-source and
                      every scraper read to know what this is, and it costs one
                      attribute. Nothing colours it: a highlighter is a
                      dependency and a bundle, and these fences are commands and
                      config files a reader copies rather than studies. */}
                  <code className={block.lang === '' ? undefined : `language-${block.lang}`}>{block.text}</code>
                </pre>
              </Fragment>
            );
          }
          case 'quote': {
            // IT IS AN ADMONITION, AND IT WOULD BE WRONG TO DRESS IT AS A
            // QUOTATION. Counted across the corpus, none of these blocks quotes
            // anybody: they are the callout each doc leads its hard part with,
            // which is how markdown spells an admonition when it has no syntax
            // for one. Dressed as a quotation it is RECESSED, so the most
            // important paragraph on the page becomes the faintest thing on it.
            // The ground separates it here, not dimness. No left bar: a thick
            // left accent is banned house-wide, and a hairline one would be the
            // only left border on the site.
            return (
              <blockquote
                key={key}
                className="mt-5 max-w-[68ch] rounded-sm border border-border bg-card px-4 py-3 leading-relaxed"
              >
                <Spans spans={block.spans} />
              </blockquote>
            );
          }
          case 'image': {
            return (
              <figure key={key} className="mt-5 flex flex-col items-center">
                <img
                  src={block.src}
                  alt={block.alt}
                  loading="lazy"
                  className="max-w-full rounded-sm border border-border"
                />
                {block.alt !== '' && (
                  <figcaption className="mt-2 max-w-[68ch] text-center text-sm text-muted-foreground">
                    {block.alt}
                  </figcaption>
                )}
              </figure>
            );
          }
          case 'diagram': {
            // A COMPONENT, BECAUSE THE ZOOM IS PER FIGURE. Everything about how
            // a diagram is drawn, picked and sized is in `DiagramFigure` above,
            // including why the picture now fits the column by default. A hook
            // cannot live in this loop, and the toggle needs one.
            return <DiagramFigure key={key} block={block} />;
          }
          case 'table': {
            // ── IT STACKS ON A PHONE, AND SCROLLS FROM `sm` UP ──
            // This used to force `min-w-[34rem]` at every width and argue that a
            // column of full sentences is unreadable squeezed, so a sideways
            // scroll is the kinder failure. Measured at 390px it is not kind. A
            // four column table shows two columns, the two that are cut off give
            // no sign they exist, and the row a reader is comparing runs off the
            // side of the thing they are reading. A scroll region inside a page
            // that already scrolls vertically is discovered by accident or not
            // at all.
            //
            // So below `sm` a row becomes a block and every cell carries its own
            // column heading. That is the reflow the old comment feared, except
            // the sentences get the full column width rather than a quarter of
            // it, and nothing is off screen. From `sm` up this is the same table
            // it always was: the real grid, the 34rem floor, the scroll wrapper,
            // the same type and the same rules.
            //
            // ONE DOM, TWO SHAPES. The stacking is `.doc-table` in `app.css`,
            // which hides the <thead> and prints `data-label` through a
            // `td::before`. A second copy of this markup for the narrow case
            // would put every cell on the page twice, which costs a screen
            // reader a whole duplicate table and costs us a second thing to keep
            // correct. The label is the FLAT text of the head cell, because an
            // attribute cannot carry markup: a heading with inline code would
            // otherwise print its backticks.
            const labels = block.head.map((cell) => spansText(cell));
            return (
              <div key={key} className="-mx-6 mt-5 overflow-x-auto px-6 sm:mx-0 sm:px-0">
                <table className="doc-table w-full min-w-0 border-collapse text-left text-sm sm:min-w-[34rem]">
                  <thead>
                    <tr className="border-b border-border">
                      {block.head.map((cell, j) => (
                        <th
                          /* oxlint-disable-next-line react/no-array-index-key -- an immutable generated tree, see the list case */
                          key={`h-${j}`}
                          className="py-2 pr-6 text-xs font-normal uppercase tracking-[0.1em] text-muted-foreground"
                        >
                          <Spans spans={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, j) => (
                      // oxlint-disable-next-line react/no-array-index-key -- an immutable generated tree, see the list case
                      <tr key={`r-${j}`} className="border-b border-border align-top">
                        {row.map((cell, k) => (
                          <td
                            /* oxlint-disable-next-line react/no-array-index-key -- an immutable generated tree, see the list case */
                            key={`c-${k}`}
                            /* A column with no heading prints no label line. The
                               attribute is left off entirely rather than set
                               empty, and the CSS matches `td[data-label]`, so an
                               unheaded cell gets no blank row above it. */
                            data-label={labels[k] === '' ? undefined : labels[k]}
                            className="py-3 pr-0 leading-relaxed sm:pr-6"
                          >
                            <Spans spans={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }
      })}
    </>
  );
}
