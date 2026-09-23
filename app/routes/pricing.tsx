/**
 * The pricing page, which exists only in a build that was given a price.
 *
 * `app/pricing-config.ts` holds the reason and the mechanism: the route is not
 * registered, not in the sitemap and not in the navigation when
 * `PRICING_PRICE_EUR` is unset, so this file is never rendered then. That is
 * what makes the loader below able to throw rather than render a page with a
 * gap where the number goes.
 *
 * ── EVERY PRICE HERE IS GROSS, AND THE PAGE SAYS SO ──
 * The Preisangabenverordnung requires a consumer to be shown the total price
 * including VAT. `pages.pricing.vatNote` is that sentence and it is not
 * optional decoration: it is printed on every build of this page, in every
 * language, and no net price appears anywhere on this site. See M213 spec 07.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import { PRIMARY_ACTION } from '#app/components/hero';
import { Copy, PageTitle } from '#app/components/page';
import { PricingPlans } from '#app/components/pricing-plans';
import { ExternalLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { PricingTrial } from '#app/components/trial-copy';
import {
  PRICE_ENV_VAR,
  priceEurFromEnvironment,
  trialScansFromEnvironment,
  yearlyEurFromEnvironment,
} from '#app/pricing-config';
import { pageMeta } from '#app/seo';
import { APP_TERMS_URL, APP_URL } from '#app/site';

/**
 * Read at build time, once per URL of the prerender pass.
 *
 * It throws on a missing price instead of falling back to one, because there is
 * no honest fallback: a route table that registered this page and an
 * environment that names no price disagree about whether the product is for
 * sale, and a build is the right place for that to stop.
 */
export function loader() {
  const priceEur = priceEurFromEnvironment();
  if (priceEur === null) {
    throw new Error(`the pricing page was registered without ${PRICE_ENV_VAR}`);
  }
  // Null is a real answer here and not a failure: it is a build that sells no yearly plan, and
  // the yearly card is simply not drawn. The page itself still exists, because it follows the
  // monthly price alone. The free scans are the same kind of answer: null draws no trial sentence.
  return { priceEur, yearlyEur: yearlyEurFromEnvironment(), trialScans: trialScansFromEnvironment() };
}

/**
 * THE ONE PAGE THAT MAY NOT IMPORT `./+types/pricing`, and the reason is the
 * same conditional registration everything else here follows: `react-router
 * typegen` writes a type module per REGISTERED route, so in a build with no
 * price that file does not exist and `pnpm typecheck` would fail on it. The
 * argument is therefore named by hand. It is the one field `pageMeta` reads.
 */
export function meta({ location }: { location: { pathname: string } }) {
  return pageMeta({
    canonicalPath: '/pricing',
    pathname: location.pathname,
    titleKey: 'pages.pricing.title',
    descriptionKey: 'pages.pricing.intro',
  });
}

export default function PricingRoute() {
  const { t } = useTranslation();
  const { priceEur, yearlyEur, trialScans } = useLoaderData<typeof loader>();

  return (
    <SiteLayout width="marketing">
      <PageTitle>{t('pages.pricing.heading')}</PageTitle>
      <Copy text={t('pages.pricing.intro')} className="mt-6 max-w-[68ch] font-prose leading-relaxed" />

      <PricingPlans priceEur={priceEur} yearlyEur={yearlyEur} />

      <section className="mt-10 space-y-4 leading-relaxed">
        <Copy text={t('pages.pricing.includes')} />
        <Copy text={t('pages.pricing.free')} />
        <PricingTrial trialScans={trialScans} />
        <p className="max-w-[68ch] text-sm text-muted-foreground">{t('pages.pricing.vatNote')}</p>
      </section>

      {/* The page's one filled button. The plans are bought inside the app, so the way in is the
          app itself, the same address the header's button opens. */}
      <p className="mt-8">
        <ExternalLink href={APP_URL} className={PRIMARY_ACTION}>
          {t('pages.pricing.cta')}
        </ExternalLink>
      </p>

      {/* An EXTERNAL link: the terms are the application's document, on the
          application's host, and this site does not keep a second copy. */}
      <p className="mt-8 text-sm">
        <ExternalLink href={APP_TERMS_URL}>{t('pages.pricing.termsLink')}</ExternalLink>
      </p>
    </SiteLayout>
  );
}
