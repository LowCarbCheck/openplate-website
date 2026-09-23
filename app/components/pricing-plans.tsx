/**
 * The three plan cards of the pricing page: self-host, monthly and, when the build was given a
 * yearly price, yearly.
 *
 * A component of its own rather than the route's body, so a unit test can render it with a yearly
 * price and without one and read the difference. The route cannot be rendered that way: its
 * loader reads the build environment.
 *
 * ── THE ROWS LINE UP ACROSS THE CARDS ──
 * From `md` the cards sit side by side, and each one is a CSS subgrid over the same five rows:
 * name, price, detail line, body, action. The rows are sized by the tallest card, so a plan name
 * that wraps (the Turkish self-host name does) pushes every card's price down together instead of
 * one price sitting lower than the others. That is also why every card renders all five slots, the
 * empty ones included: a subgrid places its children in order, and a card with no detail line
 * would move its body up into the detail row. On a phone the cards stack and the empty slots are
 * boxes of no height.
 *
 * ── ONE ACCENT ──
 * The yearly card carries the only coloured border, and nothing else: no badge, no teal fill. The
 * page's one filled button is the call to action under the grid.
 */
import { useTranslation } from 'react-i18next';

import { SECONDARY_ACTION } from '#app/components/hero';
import { Copy } from '#app/components/page';
import { SiteLink } from '#app/components/site-link';
import { useLanguage } from '#app/i18n/use-language';
import { formatPriceEur, monthlyEquivalentEur, yearlySavingPercent } from '#app/pricing-config';

/** Every card's box. `md:row-span-5` is the five rows named in the note above. */
const CARD_BASE = 'flex flex-col border bg-card p-6 shadow-sm md:row-span-5 md:grid md:grid-rows-subgrid md:gap-y-0';

const CARD = `${CARD_BASE} border-border`;
const ACCENT_CARD = `${CARD_BASE} border-primary/55`;

const PLAN_NAME = 'text-lg font-semibold tracking-tight text-balance';

/**
 * The price slot: the amount alone, large, and the period underneath it, small. Two lines instead
 * of one sentence, because "40,00 € für das erste Jahr" set as one heading wraps across three lines
 * at a card's width and a reader's eye has to find the number inside a sentence. Split, the number
 * is the only thing at that size and the period is a caption under it.
 *
 * `PLAN_PRICE_ROW` is the row's own top margin, on the wrapping element (a `<div>` for the two-line
 * cards, the `<p>` itself for self-host's single-line "Free"), so both shapes sit the same distance
 * under the plan name. `md:self-start`, for the reason `PLAN_BODY` below carries it: self-host's
 * one line and the two-line cards share a subgrid row sized to the taller of the two, and this
 * keeps the shorter cell from stretching into blank space rather than leaving that space to the row.
 */
const PLAN_PRICE_ROW = 'mt-3 md:self-start';
const PLAN_PRICE_AMOUNT = 'text-3xl font-semibold tabular-nums text-balance';
const PLAN_PRICE_PERIOD = 'mt-1 text-sm text-muted-foreground';

const PLAN_DETAIL = 'mt-1 text-sm text-muted-foreground';
/**
 * `md:self-start`: from `md` the card is a subgrid row, whose height still tracks the tallest
 * body among the three cards (that is what keeps the buttons underneath aligned). Left at the
 * default `stretch`, a short body's own box is inflated to that row's full height, which is the
 * "big empty gap" a narrow column produced when one body wrapped to twice the others' length.
 * `self-start` sizes the paragraph itself to its own text and leaves it at the top of the row, so
 * only the row keeps the shared height and the paragraph never carries the difference. Unset below
 * `md`, where the card is a flex column and `align-self` would shrink the paragraph's WIDTH instead.
 */
const PLAN_BODY = 'mt-4 font-prose leading-relaxed md:self-start';

export type PricingPlansProps = {
  /** The monthly price as the build variable writes it, `'5.00'`. */
  priceEur: string;
  /** The yearly price, or null for a build that sells no yearly plan. */
  yearlyEur: string | null;
};

export function PricingPlans({ priceEur, yearlyEur }: PricingPlansProps) {
  const { t } = useTranslation();
  // Two columns when there are two cards, so a build with no yearly plan leaves no empty third column.
  const columns = yearlyEur === null ? 'md:grid-cols-2' : 'md:grid-cols-3';

  return (
    <ul className={`mt-10 grid gap-6 md:gap-y-0 ${columns}`}>
      <li className={CARD} data-plan="self-host">
        <h2 className={PLAN_NAME}>{t('pages.pricing.selfHost.name')}</h2>
        <p className={`${PLAN_PRICE_ROW} ${PLAN_PRICE_AMOUNT}`}>{t('pages.pricing.selfHost.price')}</p>
        <div />
        <Copy text={t('pages.pricing.selfHost.body')} className={PLAN_BODY} />
        <div className="mt-6">
          <SiteLink to="/deploy" className={SECONDARY_ACTION}>
            {t('pages.pricing.selfHost.cta')}
          </SiteLink>
        </div>
      </li>

      <MonthlyCard priceEur={priceEur} />

      {yearlyEur !== null && <YearlyCard priceEur={priceEur} yearlyEur={yearlyEur} />}
    </ul>
  );
}

function MonthlyCard({ priceEur }: { priceEur: string }) {
  const { t } = useTranslation();
  const language = useLanguage();
  const price = formatPriceEur({ priceEur, language });

  return (
    <li className={CARD} data-plan="monthly">
      <h2 className={PLAN_NAME}>{t('pages.pricing.monthly.name')}</h2>
      <div className={PLAN_PRICE_ROW}>
        <p className={PLAN_PRICE_AMOUNT}>{price}</p>
        <p className={PLAN_PRICE_PERIOD}>{t('pages.pricing.monthly.period')}</p>
      </div>
      <div />
      <Copy text={t('pages.pricing.monthly.body')} className={PLAN_BODY} />
      <div />
    </li>
  );
}

function YearlyCard({ priceEur, yearlyEur }: { priceEur: string; yearlyEur: string }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const price = formatPriceEur({ priceEur: yearlyEur, language });
  const perMonth = formatPriceEur({ priceEur: monthlyEquivalentEur(yearlyEur), language });
  const saving = yearlySavingPercent({ monthlyEur: priceEur, yearlyEur });

  return (
    <li className={ACCENT_CARD} data-plan="yearly">
      <h2 className={PLAN_NAME}>{t('pages.pricing.yearly.name')}</h2>
      <div className={PLAN_PRICE_ROW}>
        <p className={PLAN_PRICE_AMOUNT}>{price}</p>
        <p className={PLAN_PRICE_PERIOD}>{t('pages.pricing.yearly.period')}</p>
      </div>
      <p className={PLAN_DETAIL}>{t('pages.pricing.yearly.perMonth', { perMonth, saving })}</p>
      <Copy text={t('pages.pricing.yearly.body')} className={PLAN_BODY} />
      <div />
    </li>
  );
}
