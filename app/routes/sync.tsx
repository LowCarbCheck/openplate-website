import { useTranslation } from 'react-i18next';

import type { Route } from './+types/sync';
import { Copy, Lead, LinkRow, PageTitle, Section } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';
import { DOC_PATHS, SYNC_RELEASES_PATH } from '#app/site';

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

  return (
    <SiteLayout>
      <PageTitle>{t('pages.sync.title')}</PageTitle>
      <Lead text={t('pages.sync.lead')} />

      <Section heading={t('pages.sync.reads.heading')}>
        <Copy text={t('pages.sync.reads.body')} />
      </Section>

      <Section heading={t('pages.sync.invites.heading')}>
        <Copy text={t('pages.sync.invites.body')} />
      </Section>

      <Section heading={t('pages.sync.proxy.heading')}>
        <Copy text={t('pages.sync.proxy.body')} />
      </Section>

      <div className="mt-12 space-y-2 border-t border-border pt-6">
        <LinkRow label={t('site.links.docsLabel')}>
          <SiteLink to={DOC_PATHS.syncProtocol}>{t('pages.sync.links.protocol')}</SiteLink>
        </LinkRow>
        <LinkRow label={t('site.links.releasesLabel')}>
          <SiteLink to={SYNC_RELEASES_PATH}>{t('pages.sync.links.releases')}</SiteLink>
        </LinkRow>
      </div>

      {/*
        The history note closes the page, after the links, because it is the
        one paragraph here that describes something a reader can no longer run.
      */}
      <Section heading={t('pages.sync.history.heading')}>
        <Copy text={t('pages.sync.history.body')} className="text-muted-foreground" />
      </Section>
    </SiteLayout>
  );
}
