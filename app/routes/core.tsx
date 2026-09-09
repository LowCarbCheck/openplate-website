/**
 * The core service's page.
 *
 * What the server can read is quoted from the protocol specification itself, and
 * what a managed instance adds is quoted from the app's architecture document.
 * The title, the lead and the link row are the site's own. See
 * `app/lib/stack-sections.ts`.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/core';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { PageHero } from '#app/components/hero';
import { SyncIcon } from '#app/components/icons';
import { Copy, LinkRow, Section } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageSections } from '#app/lib/stack-sections.server';
import { pageMeta } from '#app/seo';
import { DOC_PATHS, CORE_RELEASES_PATH } from '#app/site';

/** See `home.tsx`: the loader is what keeps the synced tree out of the browser. */
export function loader({ request }: Route.LoaderArgs) {
  return { sections: pageSections('core', request.url) };
}

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/core',
    pathname: location.pathname,
    titleKey: 'pages.core.title',
    descriptionKey: 'pages.core.lead',
  });
}

export default function CoreRoute() {
  const { t } = useTranslation();
  const { sections } = useLoaderData<typeof loader>();

  return (
    <SiteLayout width="marketing">
      <PageHero icon={SyncIcon} title={t('pages.core.title')} lead={<Copy text={t('pages.core.lead')} />} />

      {sections.map((entry) => (
        <Section key={entry.id} heading={t(entry.headingKey)}>
          <DocBlocks blocks={entry.blocks} />
        </Section>
      ))}

      <div className="mt-12 space-y-2 border-t border-border pt-6">
        <LinkRow label={t('site.links.docsLabel')}>
          <SiteLink to={DOC_PATHS.coreProtocol}>{t('pages.core.links.protocol')}</SiteLink>
        </LinkRow>
        <LinkRow label={t('site.links.releasesLabel')}>
          <SiteLink to={CORE_RELEASES_PATH}>{t('pages.core.links.releases')}</SiteLink>
        </LinkRow>
      </div>
    </SiteLayout>
  );
}
