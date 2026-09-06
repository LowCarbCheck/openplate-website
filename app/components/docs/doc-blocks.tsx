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
import { Fragment } from 'react';
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

export function DocBlocks({ blocks }: { blocks: Block[] }) {
  const { t } = useTranslation('docs');
  // THE DIAGRAM FILES ARE PER LANGUAGE, so this page has to say which one it is.
  // The labels inside a drawing are translated at sync time and baked into the
  // SVG, so picking the file is the whole of the client's part in it: there is
  // one committed pair of files per language and the reader gets the pair that
  // matches the words around it.
  const language = useLanguage();

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
            // ALREADY DRAWN, FOUR TIMES, AND COMMITTED. `sync:docs` renders the
            // fence with a headless browser and writes a light copy and a dark
            // one for each language the site publishes: an SVG has its colours
            // baked in and this site's two appearances are a media query, and it
            // has its words baked in too, which is why the language is in the
            // name rather than in a stylesheet. <picture> picks the appearance,
            // the URL picks the language: no JavaScript, no swap after paint,
            // and nothing here imports mermaid.
            //
            // The description is the <img> alt and not a caption. A caption
            // repeats to a sighted reader what the drawing beside it already
            // says; alt is what a reader who gets no drawing is given instead.
            // The fence itself stays on the page behind a disclosure, so
            // whoever wants the thing that made the picture can copy it.
            return (
              <figure key={key} className="mt-5">
                {/* SHRINK TO FIT IS THE WRONG DEFAULT FOR A DRAWING. A paragraph
                    has no smallest legible size; a flowchart does, and a phone
                    column is narrower than it. The floor lives on the <img>, the
                    scroll on the wrapper: below 40rem the picture stays full size
                    and the reader drags it, exactly as the code block and the
                    table above already scroll instead of shrinking. */}
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
                      className="w-full min-w-[40rem]"
                    />
                  </picture>
                </div>
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {t('diagramSource')}
                  </summary>
                  <pre className="mt-2 overflow-x-auto rounded-sm border border-border bg-muted p-4 font-mono text-[0.8125rem] leading-relaxed">
                    <code className="language-mermaid">{block.source}</code>
                  </pre>
                </details>
              </figure>
            );
          }
          case 'table': {
            // Scrolls rather than reflows. These tables have columns of full
            // sentences, and squeezing that into a phone's width makes it
            // unreadable in a way a sideways scroll does not.
            return (
              <div key={key} className="-mx-6 mt-5 overflow-x-auto px-6 sm:mx-0 sm:px-0">
                <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
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
                          // oxlint-disable-next-line react/no-array-index-key -- an immutable generated tree, see the list case
                          <td key={`c-${k}`} className="py-3 pr-6 leading-relaxed">
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
