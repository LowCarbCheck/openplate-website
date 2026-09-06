/**
 * The sync server's page.
 *
 * What the server can read is quoted from the protocol specification itself, and
 * what a managed instance adds is quoted from the app's architecture document.
 * The title, the lead and the link row are the site's own. See
 * `app/lib/stack-sections.ts`.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/sync';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { PageHero } from '#app/components/hero';
import { SyncIcon } from '#app/components/icons';
import { Copy, LinkRow, Section } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageSections } from '#app/lib/stack-sections.server';
import { pageMeta } from '#app/seo';
import { DOC_PATHS, SYNC_RELEASES_PATH } from '#app/site';

/** See `home.tsx`: the loader is what keeps the synced tree out of the browser. */
export function loader({ request }: Route.LoaderArgs) {
  return { sections: pageSections('sync', request.url) };
}

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/sync',
    pathname: location.pathname,
    titleKey: 'pages.sync.title',
    descriptionKey: 'pages.sync.lead',
  });
}

export default function SyncRoute() {
  const { t } = useTranslation();
  const { sections } = useLoaderData<typeof loader>();

  return (
    <SiteLayout>
      <PageHero icon={SyncIcon} title={t('pages.sync.title')} lead={<Copy text={t('pages.sync.lead')} />} />

      {sections.map((entry) => (
        <Section key={entry.id} heading={t(entry.headingKey)}>
          <DocBlocks blocks={entry.blocks} />
        </Section>
      ))}

      <div className="mt-12 space-y-2 border-t border-border pt-6">
        <LinkRow label={t('site.links.docsLabel')}>
          <SiteLink to={DOC_PATHS.syncProtocol}>{t('pages.sync.links.protocol')}</SiteLink>
        </LinkRow>
        <LinkRow label={t('site.links.releasesLabel')}>
          <SiteLink to={SYNC_RELEASES_PATH}>{t('pages.sync.links.releases')}</SiteLink>
        </LinkRow>
      </div>
    </SiteLayout>
  );
}
