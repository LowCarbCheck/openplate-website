/**
 * The documentation index: three components, and what each one publishes.
 *
 * Every row on this page is a README table row from one of the three
 * repositories. Nothing here names a page, which is the whole point of the
 * pipeline: a guide added upstream and synced appears here without an edit.
 */
import { Link, useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';

import { SiteLayout } from '#app/components/site-layout';

import { Spans } from '#app/components/docs/doc-blocks';
import { DocsShell } from '#app/components/docs/docs-shell';
import { languageFromRequest, localizePath } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';
import { translatedTitle } from '#app/lib/doc-meta';
import { translateIndex, translationsFor } from '#app/lib/docs-i18n.server';
import { docRoute, releasesRoute } from '#app/lib/doc-routes';
import { DOC_COMPONENTS } from '#app/lib/docs';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import type { Route } from './+types/docs';

/**
 * The three tables, in the reader's language.
 *
 * Every title and every blurb on this page is a README row, so translating them
 * is translating the nav: the same rows the sidebar and the previous and next
 * links draw.
 */
export function loader({ request }: Route.LoaderArgs) {
  return { index: translateIndex(DOCS_INDEX, translationsFor(languageFromRequest(request.url))) };
}

export function meta({ location }: Route.MetaArgs) {
  return [{ title: translatedTitle(location, 'title') }];
}

/** A whole-row link: title in one column, blurb in a wider one from `sm` up. */
const ROW = 'group grid gap-x-8 gap-y-1 py-4 sm:grid-cols-12';
const ROW_TITLE = 'font-semibold text-foreground underline-offset-4 group-hover:underline sm:col-span-4';

/**
 * In the same shell as a doc, so the sidebar does not move between arriving
 * here and opening a page. No contents rail: the index has no headings of its
 * own worth mapping.
 */
export default function DocsRoute() {
  const { index } = useLoaderData<typeof loader>();
  const language = useLanguage();
  const { t } = useTranslation('docs');

  return (
    <SiteLayout width="full">
      <DocsShell index={index}>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('nav')}</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
          {t('title')}
        </h1>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">{t('intro')}</p>

        {DOC_COMPONENTS.map((component) => {
          const docs = index[component];
          return (
            <section key={component} className="mt-14 max-w-5xl">
              <h2 className="text-2xl font-semibold tracking-tight">{t(`components.${component}`)}</h2>
              {/* The ref these words were read at, once per component: a reader
                  who wants provenance wants it for the set. */}
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {`${docs.source.ref} · ${docs.source.committedAt}`}
              </p>
              {/* The whole row is the target: a two-line blurb beside a short
                  link is a lot of page that looks clickable and is not. */}
              <ul className="mt-6 divide-y divide-border border-y border-border">
                {docs.entries.map((entry) => (
                  <li key={entry.slug}>
                    <Link to={localizePath(docRoute(component, entry.slug), language)} className={ROW}>
                      <span className={ROW_TITLE}>{entry.title}</span>
                      <span className="text-sm leading-relaxed text-muted-foreground sm:col-span-8">
                        <Spans spans={entry.blurb} isInsideLink />
                      </span>
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to={localizePath(releasesRoute(component), language)} className={ROW}>
                    <span className={ROW_TITLE}>{t('releases')}</span>
                  </Link>
                </li>
              </ul>
            </section>
          );
        })}
      </DocsShell>
    </SiteLayout>
  );
}
