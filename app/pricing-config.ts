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
 * ── THE SPLIT IN THIS MODULE ──
 * `priceEurFromEnvironment` is the ONLY thing here that touches `process.env`,
 * and it is called from build-time and loader code only: `app/routes.ts`,
 * `app/sitemap.ts`, `app/root.tsx` and the pricing page's own loader. Everything
 * else is a pure function of a value that was passed in, which is what lets a
 * test drive both answers, a price and no price, without a build.
 */
import type { LanguageCode } from './i18n/language';

/** The build variable. Named once so a test and a deploy script cannot disagree about it. */
export const PRICE_ENV_VAR = 'PRICING_PRICE_EUR';

/** The pricing page's canonical, unprefixed path. `app/i18n/language.ts` localizes it. */
export const PRICING_PATH = '/pricing';

/** The currency every price on this site is quoted in. */
const CURRENCY = 'EUR';

/** A euro amount as it is written in the environment: digits, optionally a point and one or two more. */
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * The price the environment names, or null when it names none.
 *
 * A value that is present but not a euro amount THROWS rather than reading as
 * absent. The two failures look identical on the deployed site, a site with no
 * pricing page, and only one of them is what somebody meant: a typo in a deploy
 * variable would otherwise ship a product with no price on it and no error.
 */
export function parsePriceEur(raw: string | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (value === '') return null;

  if (!PRICE_PATTERN.test(value)) {
    throw new Error(`${PRICE_ENV_VAR} must be a euro amount such as '4.99', and it is '${value}'`);
  }

  return value;
}

/** The build environment's answer. The one reader of `process.env` in this module; see the note above. */
export function priceEurFromEnvironment(): string | null {
  return parsePriceEur(process.env[PRICE_ENV_VAR]);
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
