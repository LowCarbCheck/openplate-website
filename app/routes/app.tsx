/**
 * The app's page.
 *
 * The two sections are cut from `openplate/docs/architecture.md`; the title, the
 * lead and the link row are the site's own. `app/lib/stack-sections.ts` holds
 * the addresses and the reasoning.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/app';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { Lead, LinkRow, PageTitle, Section } from '#app/components/page';
import { ExternalLink, SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageSections } from '#app/lib/stack-sections.server';
import { pageMeta } from '#app/seo';
import { APP_RELEASES_URL, DOC_PATHS } from '#app/site';

/** See `home.tsx`: the loader is what keeps the synced tree out of the browser. */
export function loader({ request }: Route.LoaderArgs) {
  return { sections: pageSections('app', request.url) };
}

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
  const { sections } = useLoaderData<typeof loader>();

  return (
    <SiteLayout>
      <PageTitle>{t('pages.app.title')}</PageTitle>
      <Lead text={t('pages.app.lead')} />

      {sections.map((entry) => (
        <Section key={entry.id} heading={t(entry.headingKey)}>
          <DocBlocks blocks={entry.blocks} />
        </Section>
      ))}

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
