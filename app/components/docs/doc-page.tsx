/**
 * One documentation file, whole.
 *
 * PORTED FROM collie-website's `src/components/doc-page.tsx`.
 *
 * Nothing on these pages is written here. The blocks come from
 * `src/generated/docs/`, which `pnpm sync:docs` reads out of each repository at
 * a pinned commit — so what the site says openplate does and what the repository
 * says cannot drift apart, and moving them forward is one command rather than a
 * re-read and a re-type.
 *
 * ── THE PROVENANCE IS NOT A PARAGRAPH ──
 * "Quoted from openplate's docs/sync.md at 5763d4c" is true and is not what the
 * reader came for. What replaces it is at the FOOT of the page and is a thing
 * you can use: a link to the file on GitHub. A reader who doubts the page can
 * read the source, and one who spots a mistake can fix it.
 *
 * THE REF IS `editRef`, NOT `ref`. `ref` is what the words were read from and is
 * usually a tag; you cannot commit to a tag, so `edit/v0.10.1/docs/sync.md` is
 * not an edit link. Neither value is hardcoded: both follow the sync, which is
 * the only thing that can be right on both sides of a move.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { useLanguage } from '#app/i18n/use-language';
import { localizePath } from '#app/i18n/language';
import { docRoute } from '#app/lib/doc-routes';
import { type ComponentDocs, type DocFile, slugify } from '#app/lib/docs';
import { DocBlocks, Spans } from './doc-blocks';
import { DocsShell } from './docs-shell';
import { DocsToc, sectionsOf } from './docs-toc';
import { UntranslatedNotice } from './untranslated-notice';

export function DocPage({
  doc,
  docs,
  titleId,
  translated,
}: {
  doc: DocFile;
  docs: ComponentDocs;
  /**
   * The h1's anchor, which is the ENGLISH slug of the title and is passed in
   * rather than derived here. A doc that links to another one by its title —
   * `sync.md#sync-across-devices` — has to land on the h1 in both languages, and
   * `slugify` of a translated title would move the German page's anchor out from
   * under every one of those links.
   */
  titleId?: string;
  /** Whether the memory covers this page at all. See `UntranslatedNotice`. */
  translated?: boolean;
}) {
  const language = useLanguage();
  const { t } = useTranslation('docs');
  const sections = sectionsOf(doc.blocks);
  const at = docs.entries.findIndex((entry) => entry.slug === doc.slug);
  const entry = docs.entries[at];
  const previous = at > 0 ? docs.entries[at - 1] : undefined;
  const next = docs.entries[at + 1];

  return (
    <DocsShell docs={docs} current={doc.slug} sections={sections}>
      <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">{t(`components.${doc.component}`)}</p>
      {/* The title carries its own anchor. A doc that links to another one BY
          ITS TITLE — `sync.md#sync-across-devices` — lands on the h1, and without
          an id here that link arrives at the top of the page and scrolls
          nowhere. */}
      <h1
        id={titleId ?? slugify(doc.title)}
        className="mt-4 scroll-mt-20 text-balance font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.015em]"
      >
        {doc.title}
      </h1>

      {/* WHAT THIS PAGE IS, BEFORE THE PROVENANCE OF IT. The sentence is the
          README table's second column, already synced, and is not written here:
          same rule as the nav, for the same reason. */}
      {entry === undefined ? null : (
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
          <Spans spans={entry.blurb} />
        </p>
      )}

      <UntranslatedNotice translated={translated} />

      <div className="mt-8 border-t border-border" />

      {/* The same contents, for the width band that has neither rail: from `lg`,
          where the file list has taken the left column, to `xl`, where the
          contents rail arrives. */}
      <div className="hidden lg:block xl:hidden">
        <DocsToc sections={sections} rail={false} />
      </div>

      <div className="mt-12">
        <DocBlocks blocks={doc.blocks} />
      </div>

      <p className="mt-16 border-t border-border pt-6 text-sm">
        <a
          href={`${docs.source.repo}/edit/${docs.source.editRef}/${doc.file}`}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t('edit')}
        </a>
      </p>

      {/* The neighbours, at the end of the page. These files cross-reference
          each other constantly and a reader who has finished one is exactly the
          reader who wants the next. */}
      <nav
        aria-label={t('nav')}
        className="mt-10 flex flex-wrap justify-between gap-4 border-t border-border pt-6 text-sm"
      >
        {previous === undefined ?
          <span />
        : <Link
            to={localizePath(docRoute(doc.component, previous.slug), language)}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {`← ${previous.title}`}
          </Link>
        }
        {next === undefined ? null : (
          <Link
            to={localizePath(docRoute(doc.component, next.slug), language)}
            className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {`${next.title} →`}
          </Link>
        )}
      </nav>
    </DocsShell>
  );
}
