/**
 * The research page: who we want to work with, why openplate suits a study, and how to start.
 *
 * ALL OF IT IS THE SITE'S OWN COPY, under `pages.research` in the bundles. Nothing here is quoted
 * from a member repository, so the page needs no loader and no block in `stack-sections.ts`.
 *
 * ── THE SHAPES ARE THE ONES THE REST OF THE SITE ALREADY USES ──
 * The flat card is the front page's stack card (`border bg-card shadow-sm`), the contact panel is
 * that card on the hero's graph paper, and the one filled button is `PRIMARY_ACTION`. The step
 * numbers are grey and not teal: teal on this site marks the way in, and the way in on this page is
 * the button in the contact panel at its foot.
 */
import { Trans, useTranslation } from 'react-i18next';

import type { Route } from './+types/research';
import { PRIMARY_ACTION } from '#app/components/hero';
import { Lead, PageTitle, Section } from '#app/components/page';
import { ExternalLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';
import { CONTACT_EMAIL } from '#app/site';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/research',
    pathname: location.pathname,
    titleKey: 'pages.research.title',
    descriptionKey: 'pages.research.lead',
  });
}

interface CardCopy {
  titleKey: string;
  bodyKey: string;
}

// The keys are written out rather than built from a list of ids, so a grep for any one of them
// finds the page that prints it.
const WHY: readonly CardCopy[] = [
  { titleKey: 'pages.research.why.open.title', bodyKey: 'pages.research.why.open.body' },
  { titleKey: 'pages.research.why.device.title', bodyKey: 'pages.research.why.device.body' },
  { titleKey: 'pages.research.why.consent.title', bodyKey: 'pages.research.why.consent.body' },
  { titleKey: 'pages.research.why.photo.title', bodyKey: 'pages.research.why.photo.body' },
];

const OFFER: readonly CardCopy[] = [
  { titleKey: 'pages.research.offer.base.title', bodyKey: 'pages.research.offer.base.body' },
  { titleKey: 'pages.research.offer.custom.title', bodyKey: 'pages.research.offer.custom.body' },
  { titleKey: 'pages.research.offer.export.title', bodyKey: 'pages.research.offer.export.body' },
  { titleKey: 'pages.research.offer.grants.title', bodyKey: 'pages.research.offer.grants.body' },
];

const SEEK: readonly string[] = [
  'pages.research.seek.nutrition',
  'pages.research.seek.clinical',
  'pages.research.seek.hci',
  'pages.research.seek.vision',
];

const PROCESS: readonly CardCopy[] = [
  { titleKey: 'pages.research.process.write.title', bodyKey: 'pages.research.process.write.body' },
  { titleKey: 'pages.research.process.call.title', bodyKey: 'pages.research.process.call.body' },
  { titleKey: 'pages.research.process.scope.title', bodyKey: 'pages.research.process.scope.body' },
];

/** Two columns from `sm`, one on a phone, where a half-width card would hold four words a line. */
function CardGrid({ cards }: { cards: readonly CardCopy[] }) {
  const { t } = useTranslation();

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <li key={card.titleKey} className="border border-border bg-card p-5 shadow-sm">
          <h3 className="font-semibold">{t(card.titleKey)}</h3>
          <p className="mt-2 font-prose text-sm leading-relaxed text-muted-foreground">{t(card.bodyKey)}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * The step number, two digits so the three line up, in the grey of an eyebrow.
 *
 * `aria-hidden` because the list is an `<ol>` and already says which step is which; read aloud the
 * number would be said twice.
 */
function StepNumber({ index }: { index: number }) {
  return (
    <span aria-hidden="true" className="text-sm font-semibold text-muted-foreground tabular-nums">
      {String(index + 1).padStart(2, '0')}
    </span>
  );
}

function ContactPanel() {
  const { t } = useTranslation();
  const email = CONTACT_EMAIL;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(t('pages.research.contact.subject'))}`;

  return (
    <section className="surface-grid mt-12 border border-border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-2xl font-semibold tracking-tight">{t('pages.research.contact.heading')}</h2>
      <p className="mt-4 max-w-[68ch] font-prose leading-relaxed">
        <Trans
          i18nKey="pages.research.contact.body"
          values={{ email }}
          components={{ email: <ExternalLink href={`mailto:${email}`} /> }}
        />
      </p>
      <ExternalLink href={mailto} className={`${PRIMARY_ACTION} mt-6`}>
        {t('pages.research.contact.button')}
      </ExternalLink>
    </section>
  );
}

export default function ResearchRoute() {
  const { t } = useTranslation();

  return (
    <SiteLayout width="marketing">
      <PageTitle>{t('pages.research.heading')}</PageTitle>
      <Lead text={t('pages.research.lead')} />

      <Section heading={t('pages.research.why.heading')}>
        <CardGrid cards={WHY} />
      </Section>

      <Section heading={t('pages.research.offer.heading')}>
        <CardGrid cards={OFFER} />
      </Section>

      <Section heading={t('pages.research.seek.heading')}>
        <ul className="max-w-[68ch] space-y-3 font-prose">
          {SEEK.map((key) => (
            <li key={key} className="flex gap-3">
              {/* A small square, the site's corner radius applied to a bullet. `mt-2.5` puts it
                  on the first line's x-height rather than at the top of the line box. */}
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 bg-muted-foreground" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section heading={t('pages.research.process.heading')}>
        <ol className="grid gap-6 sm:grid-cols-3">
          {PROCESS.map((step, index) => (
            <li key={step.titleKey} className="border-t border-border pt-4">
              <StepNumber index={index} />
              <h3 className="mt-2 font-semibold">{t(step.titleKey)}</h3>
              <p className="mt-2 font-prose text-sm leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <ContactPanel />
    </SiteLayout>
  );
}
