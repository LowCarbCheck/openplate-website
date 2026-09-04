/**
 * One component's release notes, newest first.
 *
 * The page exists for every component, including one whose repository has not
 * written a CHANGELOG yet: the route is generated from the component list, not
 * from what happens to have notes, so a first changelog appears here on the next
 * sync rather than needing a route added by hand.
 */
import { useLoaderData } from 'react-router';
import { useTranslation } from 'react-i18next';

import { SiteLayout } from '#app/components/site-layout';

import { DocBlocks } from '#app/components/docs/doc-blocks';
import { DocsShell } from '#app/components/docs/docs-shell';
import { UntranslatedNotice } from '#app/components/docs/untranslated-notice';
import { languageFromPathname } from '#app/i18n/language';
import { translatedTitle } from '#app/lib/doc-meta';
import { translateEntries, translationsFor } from '#app/lib/docs-i18n.server';
import { findComponent } from '#app/lib/docs';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import { RELEASES } from '../../src/generated/releases-registry';
import type { Route } from './+types/releases.$component';

/**
 * The file list is translated; the notes themselves are not, and the page says
 * so.
 *
 * A changelog line names a flag, a route and a version, and the sentence around
 * it is four words long — the three CHANGELOGs together are a third of the
 * corpus and the part of it a German reader gains least from. So the budget goes
 * on the guides. The sidebar still has to be German, because it is the same
 * sidebar the guides draw and a page that switches language between its two
 * columns reads as broken.
 */
export function loader({ params, request }: Route.LoaderArgs) {
  const component = findComponent(params.component);
  if (component === null) throw new Response('Not Found', { status: 404 });
  const language = languageFromPathname(new URL(request.url).pathname);
  return { releases: RELEASES[component], docs: translateEntries(DOCS_INDEX[component], translationsFor(language)) };
}

export function meta({ location }: Route.MetaArgs) {
  return [{ title: translatedTitle(location, 'releases') }];
}

export default function ReleasesRoute() {
  const { releases, docs } = useLoaderData<typeof loader>();
  const { t } = useTranslation('docs');

  return (
    <SiteLayout wide>
      <DocsShell docs={docs}>
        <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">
          {t(`components.${releases.component}`)}
        </p>
        <h1 className="mt-4 font-display text-[clamp(2rem,4.5vw,3rem)] font-semibold leading-[1.08] tracking-[-0.015em]">
          {t('releases')}
        </h1>
        <UntranslatedNotice />

        {releases.releases.length === 0 ?
          <p className="mt-8 max-w-[62ch] text-muted-foreground">{t('noReleases')}</p>
        : releases.releases.map((release) => (
            <section key={release.version} className="mt-14 border-t border-border pt-8 first-of-type:border-t-0">
              {/* The version is the heading and the date is beside it, not under
                  it: a reader scanning this page is looking for a number. */}
              <h2
                id={`v${release.version}`}
                className="scroll-mt-20 font-display text-2xl font-semibold tracking-[-0.01em]"
              >
                {release.version}
              </h2>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{release.date}</p>
              <div className="mt-6">
                <DocBlocks blocks={release.blocks} />
              </div>
            </section>
          ))
        }
      </DocsShell>
    </SiteLayout>
  );
}
