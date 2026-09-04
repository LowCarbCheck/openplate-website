import { useTranslation } from 'react-i18next';

import type { Route } from './+types/imprint';
import { PageTitle } from '#app/components/page';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/imprint',
    pathname: location.pathname,
    titleKey: 'pages.imprint.title',
    descriptionKey: 'pages.imprint.title',
  });
}

export default function ImprintRoute() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageTitle>{t('pages.imprint.title')}</PageTitle>

      {/*
        The four lines are placeholders on purpose: the operator's own details
        are filled in before publishing, and a plausible-looking invention here
        would be worse than an obvious marker.
      */}
      <address className="mt-6 space-y-1 not-italic leading-relaxed">
        <p>{t('pages.imprint.operator')}</p>
        <p>{t('pages.imprint.address')}</p>
        <p>{t('pages.imprint.email')}</p>
        <p>{t('pages.imprint.vat')}</p>
      </address>

      <p className="mt-6 text-sm text-muted-foreground italic">{t('pages.imprint.note')}</p>
    </SiteLayout>
  );
}
