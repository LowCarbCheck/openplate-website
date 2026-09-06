/**
 * The front page.
 *
 * EVERY PARAGRAPH THAT DESCRIBES THE SOFTWARE COMES OUT OF THE SOFTWARE'S OWN
 * DOCUMENTATION, through the loader below. What is written here is the frame:
 * the hero, the section headings, the invitation note and the licence note. See
 * `app/lib/stack-sections.ts` for which document each section is cut from.
 */
import type { ReactNode } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import type { Route } from './+types/home';
import { DocBlocks } from '#app/components/docs/doc-blocks';
import { GitHubMark, STACK_ICONS } from '#app/components/icons';
import { Lead, PageTitle, Section } from '#app/components/page';
import { ExternalLink, LINK_CLASS, SiteLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { section } from '#app/lib/stack-sections';
import { pageSections } from '#app/lib/stack-sections.server';
import type { DocComponent } from '#app/lib/docs';
import { pageMeta } from '#app/seo';
import { DOC_PATHS, REPOSITORIES } from '#app/site';

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

/**
 * A repository link, wearing the mark of the place it goes.
 *
 * ── IT IS A COMPONENT BECAUSE OF `<Trans>` ──
 * The three repository links sit inside one translated sentence, so `<Trans>` receives each of
 * them as a childless element and CLONES it with the words between the sentence's tags. There is
 * nowhere at the call site to put an icon beside those words. A component that renders the mark
 * and then its own children puts it there, and the sentence in `common.json` stays a sentence.
 *
 * The mark is sized in `em` and sits on `currentColor`, so it grows with the type around it and
 * needs no colour of its own. `align-[-0.12em]` is the optical correction: an SVG box sits on the
 * baseline, and a mark that sits ON the baseline reads as floating above the text beside it.
 *
 * ── `inline-block` ON THE LINK IS WHAT KEEPS THE MARK WITH ITS ADDRESS ──
 * A line may break between an image and the text after it, and the rendered page did exactly that:
 * a mark alone at the end of a line with `github.com/LowCarbCheck/openplate-inference` on the next
 * one. A U+2060 word joiner does not stop it, because the break is beside a replaced element and
 * not between two characters. As an inline-block the link moves to the next line whole, and when
 * it is wider than the column it wraps INSIDE itself, after one of its own slashes, with the mark
 * still on the first line of it. `white-space: nowrap` would have made the longest of the three
 * overflow a phone. The underline still belongs to the link, which draws it on its own content.
 */
function RepoLink({ href, children }: { href: string; children?: ReactNode }) {
  return (
    <ExternalLink href={href} className={`${LINK_CLASS} inline-block`}>
      <GitHubMark className="mr-1 inline-block h-[0.95em] w-[0.95em] align-[-0.12em]" />
      {children}
    </ExternalLink>
  );
}

export default function HomeRoute() {
  const { t } = useTranslation();
  const { sections } = useLoaderData<typeof loader>();

  return (
    <SiteLayout>
      <PageTitle>{t('site.name')}</PageTitle>
      <Lead text={t('pages.home.hero.body')} />

      <Section heading={t(section(sections, 'whatItIs').headingKey)}>
        <DocBlocks blocks={section(sections, 'whatItIs').blocks} />
      </Section>

      <Section heading={t('pages.home.stack.heading')}>
        <ul className="grid gap-4 sm:grid-cols-3">
          {STACK.map((component) => {
            const Icon = STACK_ICONS[component.component];
            return (
              <li key={component.to} className="rounded-2xl border border-border bg-card p-5">
                {/* The icon is its own row above the name, not a bullet beside it. Lucide's grid is
                    24 square with a 2 unit stroke, which at heading size sits heavier than the
                    word it would sit next to; given its own line at 1.25rem and the muted colour,
                    it labels the card without competing with the one link on it. */}
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
