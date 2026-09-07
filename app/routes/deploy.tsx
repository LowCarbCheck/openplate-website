/**
 * `/deploy`, the ladder of ways somebody can run openplate.
 *
 * EVERY SENTENCE ABOUT THE SOFTWARE ON THIS PAGE IS QUOTED, out of the
 * application repository's `docs/topologies.md`, through the loader below. What
 * is written here is the frame: the title, the lead, the six section headings
 * and the link row. The rule is `tests/unit/landing-claims.test.ts`'s, written
 * for the front page and followed here for the same reason: a rung is a claim
 * about which containers a person has to operate, it is revised in the commit
 * that revises the compose files, and a second account of it typed into this
 * JSX would be correct on the day it was typed and quietly wrong afterwards.
 * See `app/lib/stack-sections.ts` for which heading each section is cut from.
 *
 * ── THE HERO IS `PageTitle` AND `Lead`, NOT `PageHero` ──
 * `PageHero` takes a component icon and prints it above the title, which is
 * right for `/app`, `/sync` and `/inference`: each of those pages is about one
 * program and the icon names it. This page is about none of them and about all
 * of them at once, so there is no icon to print, and any of the three would
 * claim the page is about that one. `privacy.tsx` already opens a page this way
 * and this follows it exactly, bare rather than wrapped in a `<section>`, so
 * the site has one shape for a page with no component behind it.
 *
 * ── THE DRAWINGS STAY IN THE READING COLUMN ──
 * `home.tsx` pulls its one diagram out with `FullWidth` because it is 1728
 * pixels of flowchart and inside a 48rem measure its labels come out at about
 * six pixels. These are three to seven nodes each: the widest is 1245 pixels
 * and the rest are under a thousand, so in the same column they render at
 * roughly 1.2 to 1.7 times reduction rather than 2.7, which is what the
 * documentation pages already show them at. `DocBlocks` gives each one a
 * scrolling wrapper and a 40rem floor, so a phone drags a drawing rather than
 * shrinking it past reading. Nothing here needs `FullWidth`, and taking the
 * window six times over would turn a page of prose into a slideshow.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/deploy';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { Lead, LinkRow, PageTitle, Section } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageSections } from '#app/lib/stack-sections.server';
import { pageMeta } from '#app/seo';
import { DOC_PATHS } from '#app/site';

/** See `home.tsx`: the loader is what keeps the synced tree out of the browser. */
export function loader({ request }: Route.LoaderArgs) {
  return { sections: pageSections('deploy', request.url) };
}

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/deploy',
    pathname: location.pathname,
    titleKey: 'pages.deploy.title',
    descriptionKey: 'pages.deploy.lead',
  });
}

export default function DeployRoute() {
  const { t } = useTranslation();
  const { sections } = useLoaderData<typeof loader>();

  return (
    <SiteLayout>
      <PageTitle>{t('pages.deploy.title')}</PageTitle>
      <Lead text={t('pages.deploy.lead')} />

      {sections.map((entry) => (
        <Section key={entry.id} heading={t(entry.headingKey)}>
          <DocBlocks blocks={entry.blocks} />
        </Section>
      ))}

      <div className="mt-12 space-y-2 border-t border-border pt-6">
        {/* The document this whole page quotes, and the one a reader who has picked a rung needs
            next. Nothing on the page tells somebody how to bring a container up; `topologies.md`
            names the compose file per rung and `self-hosting.md` is the instructions. */}
        <LinkRow label={t('site.links.docsLabel')}>
          <SiteLink to={DOC_PATHS.appTopologies}>{t('pages.deploy.links.topologies')}</SiteLink>
          {', '}
          <SiteLink to={DOC_PATHS.appSelfHosting}>{t('pages.deploy.links.selfHosting')}</SiteLink>
        </LinkRow>
      </div>
    </SiteLayout>
  );
}
