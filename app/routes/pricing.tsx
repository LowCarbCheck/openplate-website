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
 * optional decoration: it sits directly under the amount, in every language,
 * and no net price appears anywhere on this site. See M213 spec 07.
 */
import { useTranslation } from 'react-i18next';
import { useLoaderData } from 'react-router';

import { Copy, PageTitle } from '#app/components/page';
import { ExternalLink } from '#app/components/site-link';
import { SiteLayout } from '#app/components/site-layout';
import { useLanguage } from '#app/i18n/use-language';
import { PRICE_ENV_VAR, formatPriceEur, priceEurFromEnvironment } from '#app/pricing-config';
import { pageMeta } from '#app/seo';
import { APP_TERMS_URL } from '#app/site';

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
  return { priceEur };
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
    descriptionKey: 'pages.pricing.body',
  });
}

export default function PricingRoute() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { priceEur } = useLoaderData<typeof loader>();

  const price = formatPriceEur({ priceEur, language });

  return (
    <SiteLayout>
      <PageTitle>{t('pages.pricing.title')}</PageTitle>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight">{t('pages.pricing.heading')}</h2>

        {/* THE AMOUNT AND ITS VAT LINE ARE ONE BLOCK, and they stay one. The
            large number is the only thing on this page a reader takes away at a
            glance, so the sentence that says what is included in it is the next
            line and not a footnote somewhere below the fold. */}
        <p className="mt-4 font-display text-4xl font-semibold tracking-tight text-primary">
          {t('pages.pricing.price', { price })}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">{t('pages.pricing.vatNote')}</p>

        <div className="mt-6 space-y-4 leading-relaxed">
          <Copy text={t('pages.pricing.trial')} />
          <Copy text={t('pages.pricing.body')} />
          <Copy text={t('pages.pricing.cancel')} />
        </div>

        {/* An EXTERNAL link: the terms are the application's document, on the
            application's host, and this site does not keep a second copy. */}
        <p className="mt-8 text-sm">
          <ExternalLink href={APP_TERMS_URL}>{t('pages.pricing.termsLink')}</ExternalLink>
        </p>
      </section>
    </SiteLayout>
  );
}
