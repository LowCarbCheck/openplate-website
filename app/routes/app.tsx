/**
 * The app's page.
 *
 * The two sections are cut from `openplate/docs/architecture.md`; the title, the
 * lead and the link row are the site's own. `app/lib/stack-sections.ts` holds
 * the addresses and the reasoning.
 *
 * THE FRONT PAGE'S VOCABULARY, AT LOWER VOLUME. `PageHero` is the same masthead
 * shape the landing page opens with, left aligned and at body sizes, because a
 * reader arrives here already knowing what openplate is. The one screenshot is
 * the diary, whole and at a size somebody can read, beside the paragraphs that
 * describe it. A grid of four would be the front page said again.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/app';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { PageHero } from '#app/components/hero';
import { AppIcon } from '#app/components/icons';
import { Copy, LinkRow, Section } from '#app/components/page';
import { ExampleDataNote, PhoneShot } from '#app/components/shot';
import { RepoLink, SiteLink } from '#app/components/site-link';
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
      <PageHero icon={AppIcon} title={t('pages.app.title')} lead={<Copy text={t('pages.app.lead')} />} />

      {/* The picture sits beside the lead rather than under the page title, so the first screen of
          this page is a claim and its evidence. `sm:grid-cols-[1fr_13rem]` and `items-start`: the
          two columns START together. Centring them against each other pushed the shot down until
          its top edge lined up with nothing at all. */}
      <div className="mt-10 gap-8 sm:grid sm:grid-cols-[1fr_13rem] sm:items-start">
        <div className="space-y-4 leading-relaxed">
          <Copy text={t('pages.app.shotIntro')} />
          <ExampleDataNote />
        </div>
        <PhoneShot
          view="diary"
          alt={t('pages.app.shotAlt')}
          className="mx-auto mt-6 w-full max-w-[13rem] sm:mt-0 sm:max-w-none"
        />
      </div>

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
          <RepoLink href={APP_RELEASES_URL}>github.com/LowCarbCheck/openplate/releases</RepoLink>
        </LinkRow>
      </div>
    </SiteLayout>
  );
}
