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
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/home';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { FeatureGrid, type Feature } from '#app/components/feature-grid';
import { Hero, PRIMARY_ACTION, SECONDARY_ACTION } from '#app/components/hero';
import { DataFlow } from '#app/components/illustrations/data-flow';
import { DataHolders } from '#app/components/illustrations/data-holders';
import { STACK_MARKS } from '#app/components/illustrations/stack-marks';
import { Section } from '#app/components/page';
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
    titleKey: 'pages.home.features.add.title',
    bodyKey: 'pages.home.features.add.body',
    altKey: 'pages.home.features.add.alt',
  },
  {
    view: 'scan',
    titleKey: 'pages.home.features.scan.title',
    bodyKey: 'pages.home.features.scan.body',
    altKey: 'pages.home.features.scan.alt',
  },
  {
    view: 'goals',
    titleKey: 'pages.home.features.goals.title',
    bodyKey: 'pages.home.features.goals.body',
    altKey: 'pages.home.features.goals.alt',
  },
  {
    view: 'overview',
    titleKey: 'pages.home.features.overview.title',
    bodyKey: 'pages.home.features.overview.body',
    altKey: 'pages.home.features.overview.alt',
  },
  // The keys are typed out rather than built from `view`. A template literal makes every one of
  // these twelve strings invisible to a grep, and `tests/unit/landing-claims.test.ts` is a grep:
  // it reads this file for the keys the page prints and checks each one exists in the bundle.
  //
  // NO `icon` FIELD, and that is not an omission. Each card's mark is now the drawing in
  // `illustrations/feature-icons.tsx`, and `FeatureGrid` looks it up by `view` rather than being
  // handed a component here. One key, one drawing, and no way to pair a card with the wrong mark.
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
    <SiteLayout width="marketing">
      {/* ── THE HEADLINE AND THE LEAD ARE NOT THE SAME SENTENCE ──
          The lead used to be `pages.home.hero.body`, which is two sentences, and the first of them
          IS the tagline printed above it almost word for word. Rendered, the page opened by saying
          the same thing twice in two type sizes. `hero.body` is still the page's meta description,
          where the repetition costs nothing and the extra clause about the photo scan is worth
          having; `hero.lead` is its second sentence, the one that says who this is for. */}
      <Hero
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

      {/* ── THE PROSE IS THE DOCUMENT'S. THE PICTURE IS NO LONGER THE DOCUMENT'S. ──
          The three paragraphs still come out of `architecture.md`, and the second of them says
          "the drawing below is the whole system in three arrows", which is exactly what `DataFlow`
          draws. The mermaid diagram that used to sit here is filtered out, and the filter is what
          drops it: leave it in and the flowchart renders inside the reading column.

          WHY THE SWAP, since the two say the same three things. The mermaid one is 1728 pixels of
          flowchart at its natural size, so a phone drags it sideways; its colours are baked into a
          committed SVG per language per appearance, so it cannot follow the theme toggle in the
          header; and it does not move. `DataFlow` is one component, sized by a class, painted from
          `currentColor` down, and it animates one token per arrow so a reader sees which way each
          arrow runs before reading a word of it.

          NOTHING ABOUT `/docs` CHANGES. The flowchart is still generated, still translated and
          still committed by `sync:docs`, and `/docs/app/architecture` still renders it. This is a
          layout decision about the front page, not a deletion: the block is still in the section
          the loader hands us, and this page chooses not to draw it. */}
      <Section heading={t(section(sections, 'topology').headingKey)}>
        <DocBlocks blocks={topology.blocks.filter((block) => block.kind !== 'diagram')} />
        {/* The one drawing on this page that gets a name read aloud. `frame.tsx` argues the case
            and this is the component it names: the three arrows, and which of them the app server
            is NOT on, are the page's whole claim, and the paragraphs above say it in prose but not
            in the shape the picture says it in. */}
        <Drawing>
          <DataFlow
            className="w-full"
            label={t('pages.home.illustrations.flow.label')}
            device={t('pages.home.illustrations.flow.device')}
            appServer={t('pages.home.illustrations.flow.appServer')}
            sync={t('pages.home.illustrations.flow.sync')}
            aiEndpoint={t('pages.home.illustrations.flow.aiEndpoint')}
            pageEdge={t('pages.home.illustrations.flow.pageEdge')}
            diaryEdge={t('pages.home.illustrations.flow.diaryEdge')}
            photoEdge={t('pages.home.illustrations.flow.photoEdge')}
          />
        </Drawing>
      </Section>

      <Section heading={t('pages.home.stack.heading')}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {STACK.map((component) => {
            const Mark = STACK_MARKS[component.component];
            return (
              <li key={component.to} className="rounded-2xl border border-border bg-card p-5">
                {/* ── A DRAWN HEADER, NOT AN ICON ──
                    This was lucide's `smartphone`, `refresh-cw` and `cpu` at 20 pixels, which say
                    "a phone", "again" and "a chip" and stop there. The marks say what each card is
                    about: the app writes to a store on the device and nothing leaves it, the sync
                    path carries a padlock the whole way with the server under it rather than on
                    it, and inference is a round trip to an endpoint with no third box on the line.
                    Sized at the grid they are drawn on, 120 by 64, in both axes: the drawings carry
                    a `viewBox` and no `width`, so one class alone would leave the other side to the
                    browser's 300 by 150 default and the three cards would not line up. */}
                <Mark className="h-16 w-[7.5rem]" />
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
        {/* ── A SUMMARY OF ONE COLUMN OF THE TABLE, SAID SO IN WORDS ──
            The table under this has two columns, "what it stores" and "what it sees in transit",
            and they do not agree: openplate-sync stores ciphertext it holds no key for and on a
            managed instance also forwards a photo it never keeps. The drawing carries storage
            only, because one bar cannot carry both without lying about one of them. Unlabelled
            that would read as a competing claim, so the caption names the column it draws and
            hands the reader to the table for the other one. Above the table, never instead of it.

            No `label` here, unlike `DataFlow`: the table below is the same five rows in prose, so
            a reader who gets no drawing has already been given everything it says. */}
        <figure>
          <Drawing>
            <DataHolders
              className="w-full"
              labels={{
                browser: t('pages.home.illustrations.holders.browser'),
                appServer: t('pages.home.illustrations.holders.appServer'),
                sync: t('pages.home.illustrations.holders.sync'),
                inference: t('pages.home.illustrations.holders.inference'),
                cloudProvider: t('pages.home.illustrations.holders.cloudProvider'),
              }}
            />
          </Drawing>
          <figcaption className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
            {t('pages.home.illustrations.holders.caption')}
          </figcaption>
        </figure>
        <DocBlocks blocks={section(sections, 'holds').blocks} />
      </Section>

      {/* `holds` says who holds the reader's data; what is counted about them is the natural next
          question, so analytics sits here and not at the bottom of the page. */}
      <Section heading={t('pages.home.analytics.heading')}>
        <p>
          <Trans
            i18nKey="pages.home.analytics.body"
            components={{ configuration: <SiteLink to={DOC_PATHS.appConfiguration} /> }}
          />
        </p>
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

/**
 * The width rule for the two big drawings on this page, written once because two call sites drift.
 *
 * ── SHRINK TO FIT IS THE WRONG DEFAULT FOR A DRAWING, AGAIN ──
 * `DataFlow` and `DataHolders` set their type at 11.5 and 12 units on a 520 unit grid, so the words
 * in them are about a forty-fourth of the rendered width. Below roughly 480 pixels that is under
 * nine pixels, which is the exact failure the mermaid flowchart had inside a 48rem measure. So the
 * floor lives on the drawing and the scroll on the wrapper, the same pairing `DocBlocks` uses for a
 * diagram, a table and a code block: on a phone the reader drags a legible picture instead of
 * squinting at a small one.
 *
 * ── AND A CEILING, WHICH THE DIAGRAM DID NOT NEED ──
 * A committed SVG stops at its natural size. These are vectors with no natural size at all, so in
 * a 72rem section `DataFlow` would render 1152 wide and 602 tall and own the screen. 44rem is about
 * as wide as the drawings were designed to be read at, and it is why neither of them uses
 * `FullWidth`: they want a cap, not the window. 44 and not 46, so that at a 768 pixel window the
 * drawing still fits the column and the sync box at its right edge is not against the margin.
 */
function Drawing({ children }: { children: ReactNode }) {
  return (
    // LEFT ALIGNED, not centred. A section is 72rem and this is 46rem, so centring moves the
    // drawing about 200 pixels right of the paragraph that introduces it and of the table that
    // follows it, and the block reads as a floating picture rather than as part of the section.
    //
    // The negative margin below `sm` is the bleed `DocBlocks` gives a wide table, copied because
    // the table it copies is the one directly under `DataHolders` on this page and two scrolling
    // blocks that start at different left edges read as a mistake. A marketing page is `px-5`, so
    // -1.25rem each side buys the drawing the phone's whole width instead of the column's.
    <div className="-mx-5 max-w-[44rem] overflow-x-auto px-5 sm:mx-0 sm:px-0">
      <div className="min-w-[30rem]">{children}</div>
    </div>
  );
}
