/**
 * The documentation start page: where to begin, then one card per component.
 *
 * It used to be three long tables, one row per guide, which was the sidebar beside it printed a
 * second time with the blurbs added. Now it answers the question a reader arrives with instead.
 * "Start here" names the two guides a new self-hoster opens first, and each component's card names
 * its three or four main guides, its version and its date, with the full list one click away.
 *
 * Nothing here names a guide's title or writes its description. `docsStartPage` builds the page
 * from the README tables in the docs index, so a guide renamed upstream arrives renamed. The only
 * hand-written choice is which guides are featured, `START_HERE` and `MAIN_GUIDES` in
 * `app/lib/docs-start.ts`, and a slug there that stops existing fails the prerender.
 */
import { Link, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';

import { STACK_ICONS } from '#app/components/icons';
import { SiteLayout } from '#app/components/site-layout';

import { Spans } from '#app/components/docs/doc-blocks';
import { DocsShell } from '#app/components/docs/docs-shell';
import { languageFromRequest, localizePath } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';
import { translatedTitle } from '#app/lib/doc-meta';
import { translateIndex, translationsFor } from '#app/lib/docs-i18n.server';
import { type ComponentCard, docsStartPage } from '#app/lib/docs-start';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import type { Route } from './+types/docs';

/**
 * The page in the reader's language. Every title and blurb is a README row, so translating them is
 * translating the nav: the same rows the sidebar draws.
 */
export function loader({ request }: Route.LoaderArgs) {
  const index = translateIndex(DOCS_INDEX, translationsFor(languageFromRequest(request.url)));
  return { index, page: docsStartPage(index) };
}

export function meta({ location }: Route.MetaArgs) {
  return [{ title: translatedTitle(location, 'title') }];
}

const EYEBROW = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';
const GUIDE_LINK = 'text-sm text-foreground underline-offset-4 hover:underline';

/**
 * One component: icon, name, version and date, its main guides, then everything else.
 *
 * "All guides" is a disclosure inside the card and not a link: there is no page that lists one
 * component's guides, and the sidebar beside this already does. Opening it pushes the cards below
 * down, which is allowed, because the reader asked. A component whose main guides are all of its
 * guides shows no disclosure, since it would repeat the list above it.
 */
function ComponentCardView({ card }: { card: ComponentCard }) {
  const language = useLanguage();
  const { t } = useTranslation('docs');
  const Icon = STACK_ICONS[card.component];
  const hasMore = card.all.length > card.featured.length;

  return (
    <section className="flex flex-col border border-border bg-card p-5">
      <h2 className="flex items-center gap-2.5 text-base font-semibold">
        <Icon className="size-5 shrink-0 text-muted-foreground" />
        {t(`components.${card.component}`)}
      </h2>
      {/* The ref these words were read at, once per component: a reader who wants provenance
          wants it for the set. */}
      <p className="mt-1 font-mono text-xs text-muted-foreground">{`${card.version} · ${card.date}`}</p>
      <ul className="mt-4 space-y-2">
        {card.featured.map((guide) => (
          <li key={guide.to}>
            <Link to={localizePath(guide.to, language)} className={GUIDE_LINK}>
              {guide.title}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-auto space-y-2 pt-5 text-sm">
        {hasMore && (
          <details>
            <summary className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground">
              {t('allGuides', { count: card.all.length })}
            </summary>
            <ul className="mt-2 space-y-2 border-t border-border pt-3">
              {card.all.map((guide) => (
                <li key={guide.to}>
                  <Link to={localizePath(guide.to, language)} className={GUIDE_LINK}>
                    {guide.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        <Link
          to={localizePath(card.releasesTo, language)}
          className="block text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          {t('releases')}
        </Link>
      </div>
    </section>
  );
}

/**
 * In the same shell as a doc, so the sidebar does not move between arriving here and opening a
 * page. No contents rail: the page has no headings of its own worth mapping.
 */
export default function DocsRoute() {
  const { index, page } = useLoaderData<typeof loader>();
  const language = useLanguage();
  const { t } = useTranslation('docs');

  return (
    <SiteLayout width="docs">
      <DocsShell index={index}>
        <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{t('title')}</h1>
        <p className="mt-4 max-w-[62ch] font-prose text-lg leading-relaxed text-muted-foreground">{t('intro')}</p>

        <section className="mt-10">
          <h2 className={EYEBROW}>{t('startHere')}</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {page.startHere.map((guide) => (
              <li key={guide.to}>
                {/* The whole box is the target: the blurb says what the guide is for, and a
                    reader choosing between two reads both before pressing either. */}
                <Link
                  to={localizePath(guide.to, language)}
                  className="group block h-full border border-border p-4 transition-colors hover:bg-muted/60"
                >
                  <span className="font-semibold text-foreground underline-offset-4 group-hover:underline">
                    {guide.title}
                  </span>
                  <span className="mt-1 block font-prose text-sm leading-relaxed text-muted-foreground">
                    <Spans spans={guide.blurb} isInsideLink />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {page.cards.map((card) => (
            <ComponentCardView key={card.component} card={card} />
          ))}
        </div>
      </DocsShell>
    </SiteLayout>
  );
}
