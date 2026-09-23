/**
 * The price, and the one thing on this site that decides whether a page exists.
 *
 * ── WHY A BUILD VARIABLE AND NOT A CONSTANT ──
 * A price is a commercial decision the company owner makes, and until it is
 * made there must be no pricing page at all: a page carrying a placeholder is a
 * page a crawler indexes and a reader quotes back. So `PRICING_PRICE_EUR` is
 * read from the build environment, and everything downstream is derived from
 * one answer. Unset means the page is not in the route table, not in the
 * sitemap and not in the navigation. Set means all three, together.
 *
 * The site is prerendered to a file per URL, so there is no request time at
 * which a price could be read instead. This is the same mechanism `root.tsx`
 * already uses for `MATOMO_SITE_ID`, and its loader note says why.
 *
 * ── THE YEARLY PLAN IS A SECOND, SUBORDINATE VARIABLE ──
 * `PRICING_YEARLY_EUR` adds the yearly card to a page that already exists. It
 * never creates the page: a build with a yearly price and no monthly one has no
 * pricing page, because the monthly price is what the route table asks about.
 * The yearly card's two derived numbers, a monthly equivalent and a saving, are
 * computed here from the two prices and are never a third variable, so they
 * cannot disagree with the prices they are derived from.
 *
 * ── THE SPLIT IN THIS MODULE ──
 * `priceEurFromEnvironment` and `yearlyEurFromEnvironment` are the ONLY things
 * here that touch `process.env`, and they are called from build-time and loader
 * code only: `app/routes.ts`, `app/sitemap.ts`, `app/root.tsx` and the pricing
 * page's own loader (the yearly one from that loader alone, since the frame does
 * not need it). Everything else is a pure function of a value that was passed
 * in, which is what lets a test drive every answer without a build.
 */
import type { LanguageCode } from './i18n/language';

/** The build variable. Named once so a test and a deploy script cannot disagree about it. */
export const PRICE_ENV_VAR = 'PRICING_PRICE_EUR';

/** The yearly plan's build variable. Shows the yearly card; never creates the page on its own. */
export const YEARLY_ENV_VAR = 'PRICING_YEARLY_EUR';

/** The pricing page's canonical, unprefixed path. `app/i18n/language.ts` localizes it. */
export const PRICING_PATH = '/pricing';

/** The currency every price on this site is quoted in. */
const CURRENCY = 'EUR';

/** A euro amount as it is written in the environment: digits, optionally a point and one or two more. */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Twelve monthly payments make the year the yearly plan is compared against. */
const MONTHS_PER_YEAR = 12;

/**
 * The amount the environment names in `envVar`, or null when it names none.
 *
 * A value that is present but not a euro amount THROWS rather than reading as
 * absent. The two failures look identical on the deployed site, a site with no
 * pricing page or no yearly card, and only one of them is what somebody meant:
 * a typo in a deploy variable would otherwise ship a product with a price
 * missing and no error.
 */
function parseEuroAmount(options: { raw: string | undefined; envVar: string }): string | null {
  const { raw, envVar } = options;
  const value = raw?.trim() ?? '';
  if (value === '') return null;

  if (!PRICE_PATTERN.test(value)) {
    throw new Error(`${envVar} must be a euro amount such as '4.99', and it is '${value}'`);
  }

  return value;
}

/** The monthly price as `PRICING_PRICE_EUR` is written, or null when it is unset. */
export function parsePriceEur(raw: string | undefined): string | null {
  return parseEuroAmount({ raw, envVar: PRICE_ENV_VAR });
}

/** The yearly price as `PRICING_YEARLY_EUR` is written, or null when it is unset. */
export function parseYearlyEur(raw: string | undefined): string | null {
  return parseEuroAmount({ raw, envVar: YEARLY_ENV_VAR });
}

/** The build environment's monthly answer. One of the two readers of `process.env` here; see the note above. */
export function priceEurFromEnvironment(): string | null {
  return parsePriceEur(process.env[PRICE_ENV_VAR]);
}

/** The build environment's yearly answer. The other reader of `process.env` here. */
export function yearlyEurFromEnvironment(): string | null {
  return parseYearlyEur(process.env[YEARLY_ENV_VAR]);
}

/**
 * A validated amount in whole cents.
 *
 * The arithmetic below is done in integer cents because a float gets a round
 * saving wrong: `1 - 48 / 60` is 0.19999999999999996, so 48 euros a year
 * against 5 a month would print 19 percent where the truth is 20.
 */
function toCents(amountEur: string): number {
  return Math.round(Number(amountEur) * 100);
}

/** What the yearly price costs per month, rounded to the nearest cent: `'40.00'` gives `'3.33'`. */
export function monthlyEquivalentEur(yearlyEur: string): string {
  const cents = Math.round(toCents(yearlyEur) / MONTHS_PER_YEAR);
  return (cents / 100).toFixed(2);
}

/**
 * The yearly plan's saving against twelve monthly payments, in whole percent, rounded DOWN.
 *
 * Down, because the page states it as a promise: 16.67 percent is written as 16,
 * never as a 17 the reader does not get. A yearly price that saves nothing
 * THROWS, since a card advertising a zero or negative saving is a pricing
 * mistake the build should stop on rather than print.
 */
export function yearlySavingPercent(options: { monthlyEur: string; yearlyEur: string }): number {
  const twelveMonthsCents = toCents(options.monthlyEur) * MONTHS_PER_YEAR;
  const savedCents = twelveMonthsCents - toCents(options.yearlyEur);
  const percent = Math.floor((savedCents * 100) / twelveMonthsCents);

  if (percent <= 0) {
    throw new Error(`${YEARLY_ENV_VAR} must cost less than twelve times ${PRICE_ENV_VAR}, and it saves nothing`);
  }

  return percent;
}

/**
 * The price as a reader of `language` writes it: `4,99 €` in German and French, `€4.99` in English.
 *
 * The currency style rather than a number plus a typed symbol, because where the
 * symbol goes, which decimal separator is used and which space sits before it
 * are three facts about a locale and not about this site.
 */
export function formatPriceEur(options: { priceEur: string; language: LanguageCode }): string {
  const { priceEur, language } = options;
  return new Intl.NumberFormat(language, { style: 'currency', currency: CURRENCY }).format(Number(priceEur));
}
