import { useTranslation } from 'react-i18next';

import type { Route } from './+types/imprint';
import { PageTitle } from '#app/components/page';
import { SiteLayout } from '#app/components/site-layout';
import { OPERATOR } from '#app/lib/operator';
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

      <address className="mt-6 space-y-1 not-italic leading-relaxed">
        <p>{OPERATOR.legalName}</p>
        <p>{OPERATOR.street}</p>
        <p>
          {OPERATOR.postalCode} {OPERATOR.city}
        </p>
        <p>{OPERATOR.country}</p>
        <p>
          {t('pages.imprint.representedBy')}: {OPERATOR.managingDirector}
        </p>
        <p>
          {t('pages.imprint.register')}: {OPERATOR.registerCourt}, {OPERATOR.registerNumber}
        </p>
        <p>
          {t('pages.imprint.vatId')}: {OPERATOR.vatId}
        </p>
        <p>
          {t('pages.imprint.email')}: {OPERATOR.imprintEmail}
        </p>
      </address>
    </SiteLayout>
  );
}
