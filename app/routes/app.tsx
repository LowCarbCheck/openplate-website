import { useTranslation } from 'react-i18next';

import type { Route } from './+types/app';
import { Copy, Lead, LinkRow, PageTitle, Section } from '#app/components/page';
import { ExternalLink, SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';
import { APP_RELEASES_URL, DOC_PATHS } from '#app/site';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/app',
    pathname: location.pathname,
    titleKey: 'pages.app.title',
    descriptionKey: 'pages.app.lead',
  });
}

export default function AppRoute() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageTitle>{t('pages.app.title')}</PageTitle>
      <Lead text={t('pages.app.lead')} />

      <Section heading={t('pages.app.stores.heading')}>
        <Copy text={t('pages.app.stores.body')} />
      </Section>

      <Section heading={t('pages.app.leaves.heading')}>
        <Copy text={t('pages.app.leaves.body')} />
      </Section>

      <div className="mt-12 space-y-2 border-t border-border pt-6">
        <LinkRow label={t('site.links.docsLabel')}>
          <SiteLink to={DOC_PATHS.appArchitecture}>{t('pages.app.links.architecture')}</SiteLink>
          {', '}
          <SiteLink to={DOC_PATHS.appSelfHosting}>{t('pages.app.links.selfHosting')}</SiteLink>
        </LinkRow>
        <LinkRow label={t('site.links.releasesLabel')}>
          <ExternalLink href={APP_RELEASES_URL}>github.com/LowCarbCheck/openplate/releases</ExternalLink>
        </LinkRow>
      </div>
    </SiteLayout>
  );
}
