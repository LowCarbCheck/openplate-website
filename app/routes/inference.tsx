import { useTranslation } from 'react-i18next';

import type { Route } from './+types/inference';
import { Copy, Lead, LinkRow, PageTitle, Section } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';
import { DOC_PATHS } from '#app/site';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/inference',
    pathname: location.pathname,
    titleKey: 'pages.inference.title',
    descriptionKey: 'pages.inference.lead',
  });
}

export default function InferenceRoute() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageTitle>{t('pages.inference.title')}</PageTitle>
      <Lead text={t('pages.inference.lead')} />

      <Section heading={t('pages.inference.hardware.heading')}>
        <Copy text={t('pages.inference.hardware.body')} />
      </Section>

      <Section heading={t('pages.inference.privacy.heading')}>
        <Copy text={t('pages.inference.privacy.body')} />
      </Section>

      <Section heading={t('pages.inference.audience.heading')}>
        <Copy text={t('pages.inference.audience.body')} />
      </Section>

      <div className="mt-12 space-y-2 border-t border-border pt-6">
        <LinkRow label={t('site.links.docsLabel')}>
          <SiteLink to={DOC_PATHS.inferenceHardware}>{t('pages.inference.links.hardware')}</SiteLink>
          {', '}
          <SiteLink to={DOC_PATHS.inferencePrivacy}>{t('pages.inference.links.privacy')}</SiteLink>
        </LinkRow>
      </div>
    </SiteLayout>
  );
}
