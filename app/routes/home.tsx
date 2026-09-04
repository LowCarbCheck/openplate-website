import { Trans, useTranslation } from 'react-i18next';

import type { Route } from './+types/home';
import { Copy, Lead, PageTitle, Section } from '#app/components/page';
import { ExternalLink, SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';
import { DOC_PATHS, REPOSITORIES } from '#app/site';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/',
    pathname: location.pathname,
    titleKey: 'pages.home.title',
    descriptionKey: 'pages.home.hero.body',
  });
}

const STACK = [
  { to: '/app', nameKey: 'pages.home.stack.app.name', bodyKey: 'pages.home.stack.app.body' },
  { to: '/sync', nameKey: 'pages.home.stack.sync.name', bodyKey: 'pages.home.stack.sync.body' },
  {
    to: '/inference',
    nameKey: 'pages.home.stack.inference.name',
    bodyKey: 'pages.home.stack.inference.body',
  },
] as const;

export default function HomeRoute() {
  const { t } = useTranslation();

  return (
    <SiteLayout>
      <PageTitle>{t('site.name')}</PageTitle>
      <Lead text={t('pages.home.hero.body')} />

      <Section heading={t('pages.home.whatItIs.heading')}>
        <Copy text={t('pages.home.whatItIs.diary')} />
        <Copy text={t('pages.home.whatItIs.photo')} />
        <Copy text={t('pages.home.whatItIs.sync')} />
      </Section>

      <Section heading={t('pages.home.stack.heading')}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {STACK.map((component) => (
            <li key={component.to} className="rounded-2xl border border-border bg-card p-5">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                <SiteLink to={component.to}>{t(component.nameKey)}</SiteLink>
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(component.bodyKey)}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading={t('pages.home.access.heading')}>
        <p>
          <Trans
            i18nKey="pages.home.access.body"
            components={{ selfHosting: <SiteLink to={DOC_PATHS.appSelfHosting} /> }}
          />
        </p>
      </Section>

      <Section heading={t('pages.home.openSource.heading')}>
        <p>
          <Trans
            i18nKey="pages.home.openSource.body"
            components={{
              repoApp: <ExternalLink href={REPOSITORIES.app} />,
              repoSync: <ExternalLink href={REPOSITORIES.sync} />,
              repoInference: <ExternalLink href={REPOSITORIES.inference} />,
            }}
          />
        </p>
      </Section>
    </SiteLayout>
  );
}
