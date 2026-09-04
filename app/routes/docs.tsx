/**
 * The documentation index: three components, and what each one publishes.
 *
 * Every row on this page is a README table row from one of the three
 * repositories. Nothing here names a page, which is the whole point of the
 * pipeline: a guide added upstream and synced appears here without an edit.
 */
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';

import { SiteLayout } from '#app/components/site-layout';

import { Spans } from '#app/components/docs/doc-blocks';
import { UntranslatedNotice } from '#app/components/docs/untranslated-notice';
import { localizePath } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';
import { translatedTitle } from '#app/lib/doc-meta';
import { docRoute, releasesRoute } from '#app/lib/doc-routes';
import { DOC_COMPONENTS } from '#app/lib/docs';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import type { Route } from './+types/docs';

export function meta({ location }: Route.MetaArgs) {
  return [{ title: translatedTitle(location, 'title') }];
}

export default function DocsRoute() {
  const language = useLanguage();
  const { t } = useTranslation('docs');

  return (
    <SiteLayout wide>
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-16">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.015em]">
          {t('title')}
        </h1>
        <p className="mt-5 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">{t('intro')}</p>
        <UntranslatedNotice />

        {DOC_COMPONENTS.map((component) => {
          const docs = DOCS_INDEX[component];
          return (
            <section key={component} className="mt-14 border-t border-border pt-8">
              <h2 className="font-display text-xl font-semibold">{t(`components.${component}`)}</h2>
              {/* The ref these words were read at, said once per component rather
                than on every page: it is provenance, and a reader who wants it
                wants it for the set. */}
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {`${docs.source.ref} · ${docs.source.committedAt}`}
              </p>
              <ul className="mt-6 space-y-4">
                {docs.entries.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      to={localizePath(docRoute(component, entry.slug), language)}
                      className="text-base font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      {entry.title}
                    </Link>
                    <p className="mt-1 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">
                      <Spans spans={entry.blurb} />
                    </p>
                  </li>
                ))}
                <li>
                  <Link
                    to={localizePath(releasesRoute(component), language)}
                    className="text-base font-semibold text-foreground underline-offset-4 hover:underline"
                  >
                    {t('releases')}
                  </Link>
                </li>
              </ul>
            </section>
          );
        })}
      </div>
    </SiteLayout>
  );
}
