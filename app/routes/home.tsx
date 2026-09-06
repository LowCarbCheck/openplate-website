/**
 * The front page.
 *
 * EVERY PARAGRAPH THAT DESCRIBES THE SOFTWARE COMES OUT OF THE SOFTWARE'S OWN
 * DOCUMENTATION, through the loader below. What is written here is the frame:
 * the hero, the four feature sentences, the section headings, the invitation
 * note and the licence note. See `app/lib/stack-sections.ts` for which document
 * each section is cut from, and `tests/unit/landing-claims.test.ts` for the rule
 * that keeps the two the only two sources.
 *
 * ── THE STRUCTURE IS THE APPLICATION'S OWN LANDING PAGE, MOVED ──
 * `openplate/app/routes/index.tsx` is 1487 lines and has been through two
 * overhaul rounds and a critique pass: the hero with the product under it, the
 * grid of screens, the media column, the step spine. Since M194 that page is
 * served at `beta.openplate.de`, the application host, while `openplate.de` is
 * the address people are given, so the designed landing was on the wrong door.
 * What moved here is the SHAPE. The words come from the repositories and the
 * pictures come from the capture script in the reader's language, so the two
 * pages cannot drift apart the way two hand-written landing pages do.
 *
 * ── SPACING IS ONE SCALE, APPLIED ──
 * Every block below the hero is a `Section`, and `Section` owns the gap. The
 * page used to set its own margins per section and the gaps were visibly
 * uneven. Nothing here should carry a vertical margin of its own; if a section
 * needs a different rhythm, the scale changes in `page.tsx` for all of them.
 */
import { Trans, useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/home';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { FeatureGrid, type Feature } from '#app/components/feature-grid';
import { Hero, PRIMARY_ACTION, SECONDARY_ACTION } from '#app/components/hero';
import { AddIcon, GoalsIcon, OverviewIcon, ScanIcon, STACK_ICONS } from '#app/components/icons';
import { FullWidth, Section } from '#app/components/page';
import { ExampleDataNote, HeroShot } from '#app/components/shot';
import { ExternalLink, RepoLink, SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { section } from '#app/lib/stack-sections';
import { pageSections } from '#app/lib/stack-sections.server';
import type { DocComponent } from '#app/lib/docs';
import { pageMeta } from '#app/seo';
import { APP_URL, DOC_PATHS, REPOSITORIES } from '#app/site';

/**
 * THE SECTIONS ARRIVE THROUGH A LOADER, and that is the whole reason this route
 * has one. React Router strips a loader from the client bundle, so the fifteen
 * synced documents and the German translation memory stay on the build machine
 * and the reader of the front page downloads the front page. The doc routes do
 * it for the same reason and say so at more length.
 */
export function loader({ request }: Route.LoaderArgs) {
  return { sections: pageSections('home', request.url) };
}

export function meta({ location }: Route.MetaArgs) {
  return pageMeta({
    canonicalPath: '/',
    pathname: location.pathname,
    titleKey: 'pages.home.title',
    descriptionKey: 'pages.home.hero.body',
  });
}

/**
 * The screens the grid shows, in the order somebody meets them.
 *
 * Add, scan, goals, overview: put a meal in, or photograph it; say what the day is aiming at; see
 * where the day stands. The diary itself is not here because it is the hero, and showing it twice
 * on one page would spend the grid's first card on the picture directly above it.
 *
 * SYNC IS NOT HERE AND HAS NO CARD, deliberately. `/settings/sync` has redirected to
 * `/settings/account` since M192, so the capture of it is a signed-out card that says you are
 * signed out: an honest picture of nothing. Sync is told further down this page by the topology
 * diagram, which draws the ciphertext leaving the device and the photo not going near the server,
 * and which the architecture document already maintains and the docs pipeline already translates.
 */
const FEATURES = [
  {
    view: 'add',
    icon: AddIcon,
    titleKey: 'pages.home.features.add.title',
    bodyKey: 'pages.home.features.add.body',
    altKey: 'pages.home.features.add.alt',
  },
  {
    view: 'scan',
    icon: ScanIcon,
    titleKey: 'pages.home.features.scan.title',
    bodyKey: 'pages.home.features.scan.body',
    altKey: 'pages.home.features.scan.alt',
  },
  {
    view: 'goals',
    icon: GoalsIcon,
    titleKey: 'pages.home.features.goals.title',
    bodyKey: 'pages.home.features.goals.body',
    altKey: 'pages.home.features.goals.alt',
  },
  {
    view: 'overview',
    icon: OverviewIcon,
    titleKey: 'pages.home.features.overview.title',
    bodyKey: 'pages.home.features.overview.body',
    altKey: 'pages.home.features.overview.alt',
  },
  // The keys are typed out rather than built from `view`. A template literal makes every one of
  // these twelve strings invisible to a grep, and `tests/unit/landing-claims.test.ts` is a grep:
  // it reads this file for the keys the page prints and checks each one exists in the bundle.
] as const satisfies readonly Feature[];

/**
 * The three components, and the id of the section that describes each one.
 *
 * ── THE CARD IS THE SAME CARD, THE SENTENCE IN IT IS NOT OURS ANY MORE ──
 * Each body was one sentence written here about somebody else's program. It is
 * now that program's README opening paragraph, which is the only text in these
 * repositories aimed at a reader who has not arrived yet. The flagship
 * documents' leads were tried first and put a protocol version, a table of
 * repository file paths and a `docker run` line on the front page: a document's
 * lead is written for whoever opened that document, and PROTOCOL.md's reader is
 * implementing the wire protocol.
 */
const STACK = [
  { to: '/app', id: 'stackApp', component: 'app' },
  { to: '/sync', id: 'stackSync', component: 'sync' },
  { to: '/inference', id: 'stackInference', component: 'inference' },
] as const satisfies readonly { to: string; id: string; component: DocComponent }[];

export default function HomeRoute() {
  const { t } = useTranslation();
  const { sections } = useLoaderData<typeof loader>();
  // Split in the component and not in the manifest: the manifest addresses WORDS, and "the lead of
  // architecture.md" is one address. Which of those blocks is a drawing is a question about layout.
  const topology = section(sections, 'topology');

  return (
    <SiteLayout>
      {/* ── THE HEADLINE AND THE LEAD ARE NOT THE SAME SENTENCE ──
          The lead used to be `pages.home.hero.body`, which is two sentences, and the first of them
          IS the tagline printed above it almost word for word. Rendered, the page opened by saying
          the same thing twice in two type sizes. `hero.body` is still the page's meta description,
          where the repetition costs nothing and the extra clause about the photo scan is worth
          having; `hero.lead` is its second sentence, the one that says who this is for. */}
      <Hero
        title={t('site.name')}
        headline={t('site.tagline')}
        lead={t('pages.home.hero.lead')}
        actions={
          <>
            {/* The one filled action on the page, and it leaves for another host: this site is
                `openplate.de` and the application is `beta.openplate.de` (M194). `ExternalLink`
                rather than `SiteLink`, so nothing tries to route it. */}
            <ExternalLink href={APP_URL} className={PRIMARY_ACTION}>
              {t('pages.home.hero.openApp')}
            </ExternalLink>
            {/* The other real destination a visitor to an open-source tracker has, said at the top
                rather than only in the close. Somebody who came to audit the code should not have
                to scroll a marketing page to find the repository. */}
            <ExternalLink href={REPOSITORIES.app} className={SECONDARY_ACTION}>
              {t('pages.home.hero.readSource')}
            </ExternalLink>
          </>
        }
        note={t('pages.home.hero.inviteNote')}
      >
        <HeroShot alt={t('pages.home.hero.shotAlt')} />
        {/* The licence for the numbers in the picture, in the same view as the picture. A reader
            who scrolls past a screenshot has already believed it, so this cannot be a footnote. */}
        <ExampleDataNote className="mt-3 text-center" />
      </Hero>

      <Section heading={t(section(sections, 'whatItIs').headingKey)}>
        <DocBlocks blocks={section(sections, 'whatItIs').blocks} />
      </Section>

      <Section heading={t('pages.home.features.heading')}>
        {/* One notice for the four pictures under it, which is one view and not a footnote. Four
            captions saying the same thing would be four times the noise and no more honest. */}
        <ExampleDataNote />
        <FeatureGrid features={FEATURES} />
      </Section>

      {/* The topology drawing, and the two paragraphs the architecture document introduces it with.
          It is the clearest thing this project has to say and it was nine paragraphs deep in a file
          a first-time reader will never open. `DocBlocks` draws it exactly as `/docs` does: two
          committed SVG files behind a `<picture>`, a scrolling wrapper and a readable floor, so a
          phone drags it rather than shrinking it past legibility. */}
      <Section heading={t(section(sections, 'topology').headingKey)}>
        <DocBlocks blocks={topology.blocks.filter((block) => block.kind !== 'diagram')} />
      </Section>
      {/* The drawing itself steps out of the reading column, because it is 1728 pixels of flowchart
          at its natural size and inside a 48rem measure its labels come out at about six pixels.
          The paragraphs above stay in the column, where they belong: the section reads as prose
          that introduces a picture, and then the picture, at a size somebody can read. */}
      <FullWidth>
        <DocBlocks blocks={topology.blocks.filter((block) => block.kind === 'diagram')} />
      </FullWidth>

      <Section heading={t('pages.home.stack.heading')}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {STACK.map((component) => {
            const Icon = STACK_ICONS[component.component];
            return (
              <li key={component.to} className="rounded-2xl border border-border bg-card p-5">
                {/* The icon is its own row above the name, not a bullet beside it. Lucide's grid is
                    24 square with a 2 unit stroke, which at heading size sits heavier than the
                    word it would sit next to; given its own line at 1.25rem and the muted colour,
                    it labels the card without competing with the links on it. */}
                <Icon className="h-5 w-5 text-muted-foreground" />
                <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">
                  <SiteLink to={component.to}>{t(section(sections, component.id).headingKey)}</SiteLink>
                </h3>
                {/* `DocBlocks` spaces a paragraph for a document, where every paragraph has one above
                  it. The first one in a card has a heading above it instead, so it drops the gap
                  and the ones after it, if a card ever quotes two, keep theirs. */}
                <div className="mt-2 text-sm text-muted-foreground [&>p:first-child]:mt-0">
                  <DocBlocks blocks={section(sections, component.id).blocks} />
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section heading={t(section(sections, 'holds').headingKey)}>
        <DocBlocks blocks={section(sections, 'holds').blocks} />
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
              repoApp: <RepoLink href={REPOSITORIES.app} />,
              repoSync: <RepoLink href={REPOSITORIES.sync} />,
              repoInference: <RepoLink href={REPOSITORIES.inference} />,
            }}
          />
        </p>
      </Section>
    </SiteLayout>
  );
}
