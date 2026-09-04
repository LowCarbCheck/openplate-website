import { useTranslation } from 'react-i18next';

import type { Route } from './+types/privacy';
import { Lead, PageTitle } from '#app/components/page';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/privacy',
    pathname: location.pathname,
    titleKey: 'pages.privacy.title',
    descriptionKey: 'pages.privacy.body',
  });
}

export default function PrivacyRoute() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageTitle>{t('pages.privacy.title')}</PageTitle>
      <Lead text={t('pages.privacy.body')} />
    </SiteLayout>
  );
}
