/**
 * The inference runtime's page.
 *
 * The hardware profiles and the privacy claim are quoted from the runtime's own
 * documentation. "Who it is for" stays written here: it says who should install
 * this and what the hosted instance does not include, which is the site placing
 * a component rather than the component describing itself.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/inference';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { PageHero } from '#app/components/hero';
import { InferenceIcon } from '#app/components/icons';
import { Copy, LinkRow, Section } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageSections } from '#app/lib/stack-sections.server';
import { pageMeta } from '#app/seo';
import { DOC_PATHS } from '#app/site';

/** See `home.tsx`: the loader is what keeps the synced tree out of the browser. */
export function loader({ request }: Route.LoaderArgs) {
  return { sections: pageSections('inference', request.url) };
}

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
  const { sections } = useLoaderData<typeof loader>();

  return (
    <SiteLayout width="marketing">
      <PageHero
        icon={InferenceIcon}
        title={t('pages.inference.title')}
        lead={<Copy text={t('pages.inference.lead')} />}
      />

      {sections.map((entry) => (
        <Section key={entry.id} heading={t(entry.headingKey)}>
          <DocBlocks blocks={entry.blocks} />
        </Section>
      ))}

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
