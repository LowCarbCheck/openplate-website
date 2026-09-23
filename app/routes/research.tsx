/**
 * The research page: who we want to work with, why openplate suits a study, and how to start.
 *
 * ALL OF IT IS THE SITE'S OWN COPY, under `pages.research` in the bundles. Nothing here is quoted
 * from a member repository, so the page needs no loader and no block in `stack-sections.ts`.
 *
 * ── THE SHAPES ──
 * A two column hero on graph paper, with `ResearchFlow` beside the words from `lg`. Under it four
 * `Section`s that fade in with `.reveal` from `app.css`: two card grids with an icon tile on each
 * card, a grid of tiles for who we are looking for, and a numbered timeline. All four are
 * `isWide`, so each heading starts on its grid's left edge. Then the contact panel, centred, which
 * the hero's button jumps to.
 *
 * Teal marks the way in and nothing else: the two filled buttons, which are one offer and not two,
 * and the check and moving dots in the drawing. Icons sit in the foreground colour on a muted tile,
 * and the step numbers stay grey.
 */
import type { ComponentType } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import type { Route } from './+types/research';
import { PRIMARY_ACTION } from '#app/components/hero';
import {
  AppIcon,
  BlocksIcon,
  CodeIcon,
  FileOutputIcon,
  GraduationCapIcon,
  HandshakeIcon,
  MailIcon,
  PointerClickIcon,
  ScanEyeIcon,
  ScanIcon,
  SettingsIcon,
  ShieldCheckIcon,
  StethoscopeIcon,
  type IconProps,
} from '#app/components/icons';
import { ResearchFlow } from '#app/components/illustrations/research-flow';
import { FullBleedBackdrop, Lead, PageTitle, Section } from '#app/components/page';
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

type Icon = ComponentType<IconProps>;

interface StepCopy {
  titleKey: string;
  bodyKey: string;
}

interface CardCopy extends StepCopy {
  icon: Icon;
}

interface SeekCopy {
  key: string;
  icon: Icon;
}

// The keys are written out rather than built from a list of ids, so a grep for any one of them
// finds the page that prints it.
const WHY: readonly CardCopy[] = [
  { titleKey: 'pages.research.why.open.title', bodyKey: 'pages.research.why.open.body', icon: CodeIcon },
  { titleKey: 'pages.research.why.device.title', bodyKey: 'pages.research.why.device.body', icon: AppIcon },
  {
    titleKey: 'pages.research.why.consent.title',
    bodyKey: 'pages.research.why.consent.body',
    icon: ShieldCheckIcon,
  },
  { titleKey: 'pages.research.why.photo.title', bodyKey: 'pages.research.why.photo.body', icon: ScanIcon },
];

const OFFER: readonly CardCopy[] = [
  { titleKey: 'pages.research.offer.base.title', bodyKey: 'pages.research.offer.base.body', icon: BlocksIcon },
  {
    titleKey: 'pages.research.offer.custom.title',
    bodyKey: 'pages.research.offer.custom.body',
    icon: SettingsIcon,
  },
  {
    titleKey: 'pages.research.offer.export.title',
    bodyKey: 'pages.research.offer.export.body',
    icon: FileOutputIcon,
  },
  {
    titleKey: 'pages.research.offer.grants.title',
    bodyKey: 'pages.research.offer.grants.body',
    icon: HandshakeIcon,
  },
];

const SEEK: readonly SeekCopy[] = [
  { key: 'pages.research.seek.nutrition', icon: GraduationCapIcon },
  { key: 'pages.research.seek.clinical', icon: StethoscopeIcon },
  { key: 'pages.research.seek.hci', icon: PointerClickIcon },
  { key: 'pages.research.seek.vision', icon: ScanEyeIcon },
];

const PROCESS: readonly StepCopy[] = [
  { titleKey: 'pages.research.process.write.title', bodyKey: 'pages.research.process.write.body' },
  { titleKey: 'pages.research.process.call.title', bodyKey: 'pages.research.process.call.body' },
  { titleKey: 'pages.research.process.scope.title', bodyKey: 'pages.research.process.scope.body' },
];

/**
 * The hero: the words and the way in on the left, the drawing on the right from `lg`.
 *
 * From `lg` the drawing fills a column of up to 32rem. Its wrapper carries the drawing's aspect
 * ratio, so its box is reserved at first paint.
 * Below `sm` it is not drawn at all, which is a CSS decision and moves nothing. The backdrop is the
 * front page's graph paper and glow, masked on three sides so it fades out instead of ending on a
 * line; the top edge sits on the header's own border, as `HeroBackdrop` in `hero.tsx` explains.
 */
function ResearchHero() {
  const { t } = useTranslation();

  return (
    // `isolate` gives the backdrop's `-z-10` a stacking context; see `FullBleedBackdrop`.
    <section className="relative isolate pb-6">
      <FullBleedBackdrop className="surface-grid -top-12 bottom-0 [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,black_55%,transparent),linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <div className="brand-glow absolute inset-0" />
      </FullBleedBackdrop>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:gap-12">
        <div>
          <PageTitle>{t('pages.research.heading')}</PageTitle>
          <Lead text={t('pages.research.lead')} />
          <a href="#contact" className={`${PRIMARY_ACTION} mt-8`}>
            {t('pages.research.contact.button')}
          </a>
        </div>
        <div className="mx-auto hidden aspect-[440/300] w-full max-w-md sm:block lg:max-w-none">
          <ResearchFlow className="h-full w-full" />
        </div>
      </div>
    </section>
  );
}

/** A 40 pixel square with a 20 pixel icon, the same on a card, a tile and the contact heading. */
function IconTile({ icon: TileIcon }: { icon: Icon }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center border border-border bg-muted text-foreground">
      <TileIcon className="size-5" />
    </span>
  );
}

/**
 * One column on a phone, two from `sm`, four from `lg`.
 *
 * Grid rows stretch their items, so every card in a row is as tall as the tallest. The hover is
 * decoration only: a card is not a link, so the border moves to grey and never to teal.
 */
function CardGrid({ cards }: { cards: readonly CardCopy[] }) {
  const { t } = useTranslation();

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <li
          key={card.titleKey}
          className="flex flex-col border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-muted-foreground/50"
        >
          <IconTile icon={card.icon} />
          <h3 className="mt-4 font-semibold">{t(card.titleKey)}</h3>
          <p className="mt-2 font-prose text-sm leading-relaxed text-muted-foreground">{t(card.bodyKey)}</p>
        </li>
      ))}
    </ul>
  );
}

/** Who we are looking for, one tile per group, two columns from `sm`. */
function SeekGrid() {
  const { t } = useTranslation();

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {SEEK.map((entry) => (
        <li key={entry.key} className="flex items-center gap-4 border border-border bg-card p-5 shadow-sm">
          <IconTile icon={entry.icon} />
          <span className="font-prose leading-relaxed">{t(entry.key)}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * The step number in a circle, two digits so the three line up, in the grey of an eyebrow.
 *
 * `aria-hidden` because the list is an `<ol>` and already says which step is which; read aloud the
 * number would be said twice. `rounded-full` is the one radius the site keeps, for a circle.
 */
function StepNumber({ index }: { index: number }) {
  return (
    <span
      aria-hidden="true"
      className="absolute top-0 left-0 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-muted-foreground tabular-nums"
    >
      {String(index + 1).padStart(2, '0')}
    </span>
  );
}

/**
 * The three steps as a timeline: down the left on a phone, across in a row from `sm`.
 *
 * The line is each step's `::before`, from its own circle to the next one, and the last step has
 * none. It is a pseudo element because an `<ol>` may only hold `<li>`s. `.reveal-steps` in
 * `app.css` draws it in as the list scrolls into view; without that support it is simply drawn.
 */
function Timeline() {
  const { t } = useTranslation();

  return (
    <ol className="reveal-steps grid gap-8 sm:grid-cols-3">
      {PROCESS.map((step, index) => (
        <li
          key={step.titleKey}
          className="relative pt-2 pl-14 before:absolute before:top-12 before:-bottom-6 before:left-[calc(1.25rem-0.5px)] before:w-px before:bg-border last:before:hidden sm:pt-14 sm:pl-0 sm:before:top-[calc(1.25rem-0.5px)] sm:before:-right-6 sm:before:bottom-auto sm:before:left-12 sm:before:h-px sm:before:w-auto"
        >
          <StepNumber index={index} />
          <h3 className="font-semibold">{t(step.titleKey)}</h3>
          <p className="mt-2 font-prose text-sm leading-relaxed text-muted-foreground">{t(step.bodyKey)}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The foot of the page and the target of the hero's button.
 *
 * 47rem is `MEASURE`'s 42rem plus the panel's padding, so from `sm` its words sit in the same
 * centred column as the prose on every other marketing page. The glow sits at `-z-10` inside `isolate`: over
 * the panel's graph paper, under its words.
 */
function ContactPanel() {
  const { t } = useTranslation();
  const email = CONTACT_EMAIL;
  const mailto = `mailto:${email}?subject=${encodeURIComponent(t('pages.research.contact.subject'))}`;

  return (
    <section
      id="contact"
      className="reveal surface-grid relative isolate mx-auto mt-16 max-w-[47rem] overflow-hidden border border-border bg-card p-6 shadow-sm sm:p-10"
    >
      <div aria-hidden="true" className="brand-glow absolute inset-0 -z-10" />
      <h2 className="flex items-center gap-4 text-2xl font-semibold tracking-tight">
        <IconTile icon={MailIcon} />
        {t('pages.research.contact.heading')}
      </h2>
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
      <ResearchHero />

      <Section heading={t('pages.research.why.heading')} isWide className="reveal">
        <CardGrid cards={WHY} />
      </Section>

      <Section heading={t('pages.research.offer.heading')} isWide className="reveal">
        <CardGrid cards={OFFER} />
      </Section>

      <Section heading={t('pages.research.seek.heading')} isWide className="reveal">
        <SeekGrid />
      </Section>

      <Section heading={t('pages.research.process.heading')} isWide className="reveal">
        <Timeline />
      </Section>

      <ContactPanel />
    </SiteLayout>
  );
}
