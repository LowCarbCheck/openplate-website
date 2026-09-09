/**
 * The pricing page is the one page on this site whose EXISTENCE is a build
 * decision (`app/pricing-config.ts`), and a conditional page has two ways to be
 * wrong that a single gate run cannot see: it can be missing from a build that
 * has a price, and it can be advertised by a build that has none. The gate runs
 * with no `PRICING_PRICE_EUR`, so every case here drives the price in by hand
 * and asserts BOTH answers. A case that only checked the absent one would pass
 * against a route table that never registers the page at all.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import deCommon from '../../app/i18n/locales/de/common.json';
import enCommon from '../../app/i18n/locales/en/common.json';
import frCommon from '../../app/i18n/locales/fr/common.json';
import { SUPPORTED_LANGUAGES, localizePath, type LanguageCode } from '../../app/i18n/language';
import { PRICE_ENV_VAR, PRICING_PATH, formatPriceEur, parsePriceEur } from '../../app/pricing-config';
import { pagesForPrice } from '../../app/routes';
import { buildSitemapXml, staticPathsForPrice } from '../../app/sitemap';
import { SITE_ORIGIN } from '../../app/site';

/** A price in the shape a deploy would set, used everywhere a set variable is needed. */
const PRICE = '4.99';

/** Every key the page renders, so a bundle that lost one fails here rather than on the page. */
const COPY_KEYS = ['title', 'heading', 'price', 'vatNote', 'trial', 'body', 'cancel', 'termsLink'] as const;

type CopyKey = (typeof COPY_KEYS)[number];

const BUNDLES = { de: deCommon, en: enCommon, fr: frCommon };

/** The page's copy in one language. Typed by the bundles themselves, so a key removed from a file is a type error too. */
function pricingCopy(language: LanguageCode): Record<CopyKey, string> {
  return BUNDLES[language].pages.pricing;
}

describe('parsePriceEur', () => {
  it('reads an unset and an empty variable as no price', () => {
    assert.equal(parsePriceEur(undefined), null);
    assert.equal(parsePriceEur(''), null);
    assert.equal(parsePriceEur('   '), null);
  });

  it('reads a euro amount, with or without cents', () => {
    assert.equal(parsePriceEur(PRICE), PRICE);
    assert.equal(parsePriceEur(' 4.99 '), PRICE);
    assert.equal(parsePriceEur('5'), '5');
  });

  it('throws on a value that is present and not an amount, rather than reading it as absent', () => {
    // The control that makes the case above mean something: a typo in a deploy
    // variable must not ship a site with no price on it and no error.
    assert.throws(() => parsePriceEur('4,99'), new RegExp(PRICE_ENV_VAR));
    assert.throws(() => parsePriceEur('4.99 EUR'), new RegExp(PRICE_ENV_VAR));
    assert.throws(() => parsePriceEur('free'), new RegExp(PRICE_ENV_VAR));
  });
});

describe('the route table', () => {
  it('does not register the pricing page when the build was given no price', () => {
    const ids = pagesForPrice(null).map((page) => page.id);
    assert.ok(!ids.includes('pricing'), 'an unpriced build registered a pricing route');
  });

  it('registers it when the build was given one', () => {
    const pages = pagesForPrice(PRICE);
    const pricing = pages.find((page) => page.id === 'pricing');

    assert.ok(pricing, 'a priced build registered no pricing route');
    assert.equal(pricing.path, PRICING_PATH.slice(1));
    assert.equal(pricing.file, 'routes/pricing.tsx');
  });

  it('changes nothing else about the table', () => {
    const withoutPricing = pagesForPrice(PRICE).filter((page) => page.id !== 'pricing');
    assert.deepEqual(withoutPricing, pagesForPrice(null));
  });
});

describe('the sitemap path list', () => {
  it('leaves the pricing page out when the build was given no price', () => {
    assert.ok(!staticPathsForPrice(null).includes(PRICING_PATH));
  });

  it('names it when the build was given one', () => {
    assert.ok(staticPathsForPrice(PRICE).includes(PRICING_PATH));
  });

  it('holds exactly the parameterless routes, for either answer', () => {
    // The same check `sitemap.test.ts` makes for this build, made for both
    // builds: the two lists are written in different modules and the pricing
    // page is the one row that can now be in one and not the other.
    for (const priceEur of [null, PRICE]) {
      const routePaths = pagesForPrice(priceEur)
        .filter((page) => !page.path?.includes(':'))
        .map((page) => (page.path === undefined ? '/' : `/${page.path}`));

      assert.deepEqual(staticPathsForPrice(priceEur).toSorted(), routePaths.toSorted());
    }
  });
});

describe('the rendered sitemap', () => {
  it('carries no pricing URL in any language for an unpriced build', () => {
    const xml = buildSitemapXml({ staticPaths: staticPathsForPrice(null) });

    for (const language of SUPPORTED_LANGUAGES) {
      assert.ok(!xml.includes(`${SITE_ORIGIN}${localizePath(PRICING_PATH, language)}<`));
    }
  });

  it('carries one in every language for a priced build', () => {
    const xml = buildSitemapXml({ staticPaths: staticPathsForPrice(PRICE) });

    for (const language of SUPPORTED_LANGUAGES) {
      const url = `${SITE_ORIGIN}${localizePath(PRICING_PATH, language)}`;
      assert.ok(xml.includes(`<loc>${url}</loc>`), `missing ${url}`);
    }
  });
});

describe('formatPriceEur', () => {
  it('writes the amount the way a reader of each language writes it', () => {
    // Asserted in pieces rather than as a literal string: the space before the
    // symbol is a no-break space whose exact codepoint moves between ICU
    // versions, and pinning it would fail on a Node upgrade while saying
    // nothing about the price.
    const german = formatPriceEur({ priceEur: PRICE, language: 'de' });
    const french = formatPriceEur({ priceEur: PRICE, language: 'fr' });
    const english = formatPriceEur({ priceEur: PRICE, language: 'en' });

    assert.ok(german.startsWith('4,99'), german);
    assert.ok(german.endsWith('€'), german);
    assert.ok(french.startsWith('4,99'), french);
    assert.ok(french.endsWith('€'), french);
    assert.equal(english, '€4.99');
  });

  it('keeps two decimals on a round amount, because a price is written in cents', () => {
    assert.equal(formatPriceEur({ priceEur: '5', language: 'en' }), '€5.00');
    assert.ok(formatPriceEur({ priceEur: '5', language: 'de' }).startsWith('5,00'));
  });
});

describe('the pricing copy', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    it(`exists in ${language}, every key the page renders`, () => {
      const pricing = pricingCopy(language);

      for (const key of COPY_KEYS) {
        assert.ok(pricing[key].length > 0, `${language}: pages.pricing.${key} is missing or empty`);
      }
    });

    it(`carries the price placeholder in ${language}`, () => {
      // The one interpolation on the page. A translation that dropped it would
      // render a sentence with no number in it and no error anywhere.
      const pricing = pricingCopy(language);
      assert.ok(pricing.price.includes('{{price}}'), `${language}: the price line lost {{price}}`);
    });
  }

  it('states that the price includes VAT, in every language', () => {
    // Structure, not wording: the sentence itself is the wordsmith's and may be
    // rephrased. What may not change is that a VAT line exists at all, because
    // the Preisangabenverordnung is why it is there.
    for (const language of SUPPORTED_LANGUAGES) {
      const { vatNote } = pricingCopy(language);
      assert.ok(vatNote.length > 0, `${language}: no VAT line`);
    }
  });
});
