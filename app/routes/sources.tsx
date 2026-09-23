/**
 * The data sources page: where every number openplate shows comes from, and under which terms.
 *
 * ALL OF IT IS THE SITE'S OWN COPY, under `pages.sources` in the bundles. Nothing here is quoted
 * from a member repository, so the page needs no loader and no block in `stack-sections.ts`.
 *
 * ── THE SHAPES ──
 * The research page's vocabulary. A two column hero on graph paper, with the four groups beside the
 * words from `lg` as jump links to their sections. Under it one section per group, each with an icon
 * tile in its heading, a rule above it and `.reveal` from `app.css`. From `lg` a section is two
 * columns: the heading and the paragraph that frames the group on the left, the entries on the
 * right. On a phone the right column simply follows the left one.
 *
 * The entries are cards in the site's one card style. The BLS attribution is its own quoted line
 * inside a card, and the note on the reference basis is the one tinted box on the page.
 *
 * ── THE LINKS DO NOT TOUCH THE COPY ──
 * The sentences are exactly what the wordsmith judged, and every translation of them carries no
 * link tags. So an outbound link is never wrapped around words in a sentence: it is a host name,
 * on a reference card or in a row under its section. A host name is an address and is not
 * translated. Each one answered 200 or a redirect to a 200 page on 2026-09-23; a source whose site
 * could not be checked has no link rather than a guessed one.
 */
import type { ComponentType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { Route } from './+types/sources';
import {
  BookOpenIcon,
  DatabaseIcon,
  GoalsIcon,
  ScanIcon,
  type IconProps,
} from '#app/components/icons';
import { FullBleedBackdrop, IconTile, Lead, PageTitle } from '#app/components/page';
import { ExternalLink, SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { pageMeta } from '#app/seo';

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/sources',
    pathname: location.pathname,
    titleKey: 'pages.sources.title',
    descriptionKey: 'pages.sources.lead',
  });
}

type Icon = ComponentType<IconProps>;

/** An outbound link, labelled by the host a reader will land on. */
interface SourceLink {
  href: string;
  host: string;
}

/**
 * Every outbound address on the page, checked with `curl -sI` on 2026-09-23.
 *
 * `lowcarbcheck.org` answers 302 to its own language root, and `blsdb.de` is the Max Rubner-Institut's
 * own site for the BLS, which carries the institute's name and logo. The NASEM link is the academies'
 * front page: their dietary reference intake project pages move, and two of them answered 404.
 */
const LINKS = {
  lowCarbCheck: { href: 'https://lowcarbcheck.org/', host: 'lowcarbcheck.org' },
  bls: { href: 'https://blsdb.de/', host: 'blsdb.de' },
  foodDataCentral: { href: 'https://fdc.nal.usda.gov/', host: 'fdc.nal.usda.gov' },
  dge: { href: 'https://www.dge.de/wissenschaft/referenzwerte/', host: 'dge.de' },
  efsa: { href: 'https://www.efsa.europa.eu/en/topics/topic/dietary-reference-values', host: 'efsa.europa.eu' },
  nasem: { href: 'https://www.nationalacademies.org/', host: 'nationalacademies.org' },
  openFoodFacts: { href: 'https://world.openfoodfacts.org/', host: 'openfoodfacts.org' },
} as const satisfies Record<string, SourceLink>;

/** One group of sources: its anchor, its mark, and its heading. */
interface GroupCopy {
  id: string;
  icon: Icon;
  headingKey: string;
}

// The keys are written out rather than built from a list of ids, so a grep for any one of them
// finds the page that prints it. The marks for goals and the scanned plate are the ones the front
// page's feature grid gives those two screens.
const FOODS: GroupCopy = { id: 'foods', icon: DatabaseIcon, headingKey: 'pages.sources.foods.heading' };
const REFERENCES: GroupCopy = {
  id: 'references',
  icon: BookOpenIcon,
  headingKey: 'pages.sources.references.heading',
};
const GOALS: GroupCopy = { id: 'goals', icon: GoalsIcon, headingKey: 'pages.sources.goals.heading' };
const AI: GroupCopy = { id: 'ai', icon: ScanIcon, headingKey: 'pages.sources.ai.heading' };

const GROUPS: readonly GroupCopy[] = [FOODS, REFERENCES, GOALS, AI];

/**
 * The three reference bases. The label is the body's own abbreviation, which is the same in every
 * language, so it is written here and not translated.
 */
const REFERENCE_BASES: readonly { label: string; key: string; link: SourceLink }[] = [
  { label: 'DGE', key: 'pages.sources.references.dge', link: LINKS.dge },
  { label: 'EFSA', key: 'pages.sources.references.efsa', link: LINKS.efsa },
  { label: 'NASEM', key: 'pages.sources.references.nasem', link: LINKS.nasem },
];

const GOAL_KEYS: readonly string[] = [
  'pages.sources.goals.calories',
  'pages.sources.goals.protein',
  'pages.sources.goals.fiber',
];

/** The grey eyebrow the footer and the docs start page use, for the abbreviation on a card. */
const EYEBROW = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground';

/** The site's one card: a border on all four sides, the card surface and a soft shadow. */
const CARD = 'border border-border bg-card p-5 shadow-sm';

/**
 * A sentence cut at its quoted passage, or null when it has none.
 *
 * The attribution sentence quotes the exact credit line the app prints, and the page sets that
 * line apart. The translations quote it with their own marks (`„…“`, `« … »`, `“…”`), so the
 * pattern accepts each of them. The punctuation straight after the closing mark is cut out on its
 * own, so the full stop stays on the credit line's row and never opens the next one. A sentence
 * with no quote in it comes back as null and is printed whole, which is the safe answer for a
 * translation that phrased it differently.
 */
function splitQuoted(
  text: string,
): { before: string; quote: string; punctuation: string; after: string } | null {
  const match = /^([\s\S]*?)(["“„«‚‘][^"“”„«»‚‘’]{8,}["”“»‘’])([.,;:]*)([\s\S]*)$/.exec(text);
  if (!match) return null;
  const [, before = '', quote = '', punctuation = '', after = ''] = match;
  return { before, quote, punctuation, after };
}

/**
 * A sentence cut after its run in label, or null when it has none.
 *
 * Each goal line opens with what it is about and a colon ("Daily calories: the Mifflin-St Jeor
 * equation"). The label keeps its colon, and the space after it stays in the output, so the
 * printed sentence is the bundle's string byte for byte with one part in bold. French puts a space
 * before its colon, and that space simply stays in the label. More than 48 characters before the
 * first colon is not a label, and the line is printed plain.
 */
function splitRunIn(text: string): { label: string; rest: string } | null {
  const match = /^([^:]{1,48}:)(\s[\s\S]*)$/.exec(text);
  if (!match) return null;
  const [, label = '', rest = ''] = match;
  return { label, rest };
}

/**
 * The hero: the heading and the lead on the left, the four groups as jump links on the right.
 *
 * The list is drawn from `lg` only, where the column beside the words would otherwise be empty. On a
 * phone the sections follow the lead directly and a list of them would be a screen of repetition.
 * That is a CSS decision, so nothing moves when it applies. The backdrop is the research hero's.
 */
function SourcesHero() {
  const { t } = useTranslation();

  return (
    // `isolate` gives the backdrop's `-z-10` a stacking context; see `FullBleedBackdrop`.
    <section className="relative isolate pb-6">
      <FullBleedBackdrop className="surface-grid -top-12 bottom-0 [mask-composite:intersect] [mask-image:linear-gradient(to_bottom,black_55%,transparent),linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
        <div className="brand-glow absolute inset-0" />
      </FullBleedBackdrop>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
        <div>
          <PageTitle>{t('pages.sources.heading')}</PageTitle>
          <Lead text={t('pages.sources.lead')} />
        </div>
        <ul className="hidden gap-3 lg:grid">
          {GROUPS.map((group) => (
            <li key={group.id}>
              <a
                href={`#${group.id}`}
                className="flex items-center gap-4 border border-border bg-card p-3 shadow-sm transition-colors hover:border-muted-foreground/50"
              >
                <IconTile icon={group.icon} />
                <span className="font-semibold text-balance">{t(group.headingKey)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * One group: a rule, the heading with its tile, the framing words on the left and the entries on
 * the right from `lg`.
 *
 * `scroll-mt-6` so a jump from the hero lands with the rule in view rather than under the window's
 * top edge. The heading has an id so the section is named by it for a screen reader.
 */
function SourceGroup({ group, lead, entries }: { group: GroupCopy; lead: ReactNode; entries: ReactNode }) {
  const { t } = useTranslation();
  const headingId = `${group.id}-heading`;

  return (
    <section
      id={group.id}
      aria-labelledby={headingId}
      className="reveal mt-12 scroll-mt-6 border-t border-border pt-10 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12"
    >
      <div>
        <h2 id={headingId} className="flex items-center gap-4 text-2xl font-semibold tracking-tight text-balance">
          <IconTile icon={group.icon} />
          {t(group.headingKey)}
        </h2>
        <div className="mt-5 max-w-[68ch] space-y-4 font-prose leading-relaxed">{lead}</div>
      </div>
      <div className="mt-6 space-y-4 lg:mt-0">{entries}</div>
    </section>
  );
}

/** A row of outbound links under a section, each labelled by its host. */
function LinkList({ links, children }: { links: readonly SourceLink[]; children?: ReactNode }) {
  return (
    <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
      {links.map((link) => (
        <li key={link.href}>
          <ExternalLink href={link.href}>{link.host}</ExternalLink>
        </li>
      ))}
      {children}
    </ul>
  );
}

/**
 * The attribution sentence, with the credit line itself on a line of its own in the chip style the
 * docs give a code span. The quotation marks stay inside the chip, because they are part of the
 * sentence the translator wrote, and the full stop after them sits right beside the chip.
 */
function Attribution({ text }: { text: string }) {
  const parts = splitQuoted(text);

  return (
    <figure className={CARD}>
      {parts === null ? (
        <p className="font-prose leading-relaxed">{text}</p>
      ) : (
        <p className="font-prose leading-relaxed">
          {parts.before.trimEnd()}
          {/* An inline box and not an inline-block: a full stop may not break away from a closing
              quote, so it stays on the chip's last line at every width. `box-decoration-clone`
              draws the border on each line the chip wraps to, as `CodeChip` does. */}
          <span className="my-3 block leading-8">
            <span className="box-decoration-clone border border-foreground/20 bg-foreground/8 px-1.5 py-1 font-mono text-sm text-foreground">
              {parts.quote}
            </span>
            {parts.punctuation}
          </span>
          {parts.after.trimStart()}
        </p>
      )}
    </figure>
  );
}

/** A goal line with its label in bold, or plain when the line has no label to cut. */
function RunIn({ text }: { text: string }) {
  const parts = splitRunIn(text);
  if (parts === null) return <>{text}</>;

  return (
    <>
      <strong className="font-semibold text-foreground">{parts.label}</strong>
      {parts.rest}
    </>
  );
}

function FoodsGroup() {
  const { t } = useTranslation();

  return (
    <SourceGroup
      group={FOODS}
      lead={<p>{t('pages.sources.foods.body')}</p>}
      entries={
        <>
          <Attribution text={t('pages.sources.foods.attribution')} />
          <p className="max-w-[68ch] font-prose leading-relaxed">{t('pages.sources.foods.hosted')}</p>
          <LinkList links={[LINKS.lowCarbCheck, LINKS.bls, LINKS.foodDataCentral]} />
        </>
      }
    />
  );
}

/**
 * The three bases, one card each, and the note for a study under the framing paragraph.
 *
 * The note is the page's one tinted box: a 1 pixel teal border on all four sides and a faint teal
 * surface, square like every box here. It is the sentence a study lead most needs from this page.
 */
function ReferencesGroup() {
  const { t } = useTranslation();

  return (
    <SourceGroup
      group={REFERENCES}
      lead={
        <>
          <p>{t('pages.sources.references.body')}</p>
          <p className="border border-primary/40 bg-primary/5 p-4 text-foreground">
            {t('pages.sources.references.note')}
          </p>
        </>
      }
      entries={
        <ul className="space-y-4">
          {REFERENCE_BASES.map((base) => (
            <li key={base.key} className={`${CARD} flex flex-col`}>
              <span className={EYEBROW}>{base.label}</span>
              <p className="mt-2 font-prose leading-relaxed">{t(base.key)}</p>
              <p className="mt-3 text-sm">
                <ExternalLink href={base.link.href}>{base.link.host}</ExternalLink>
              </p>
            </li>
          ))}
        </ul>
      }
    />
  );
}

function GoalsGroup() {
  const { t } = useTranslation();

  return (
    <SourceGroup
      group={GOALS}
      lead={<p>{t('pages.sources.goals.body')}</p>}
      entries={
        <ul className="space-y-4">
          {GOAL_KEYS.map((key) => (
            <li key={key} className={`${CARD} font-prose leading-relaxed text-muted-foreground`}>
              <RunIn text={t(key)} />
            </li>
          ))}
        </ul>
      }
    />
  );
}

/**
 * The model's estimates, and what the self-hosted runtime looks foods up in.
 *
 * The runtime's own page is linked beside the Open Food Facts address, by the header's own label for
 * it, because the second paragraph is about that component.
 */
function AiGroup() {
  const { t } = useTranslation();

  return (
    <SourceGroup
      group={AI}
      lead={<p>{t('pages.sources.ai.body')}</p>}
      entries={
        <>
          <p className={`${CARD} font-prose leading-relaxed`}>{t('pages.sources.ai.inference')}</p>
          <LinkList links={[LINKS.foodDataCentral, LINKS.openFoodFacts]}>
            <li>
              <SiteLink to="/inference">{t('site.nav.inference')}</SiteLink>
            </li>
          </LinkList>
        </>
      }
    />
  );
}

export default function SourcesRoute() {
  return (
    <SiteLayout width="marketing">
      <SourcesHero />
      <FoodsGroup />
      <ReferencesGroup />
      <GoalsGroup />
      <AiGroup />
    </SiteLayout>
  );
}
