/**
 * The free scans a new account gets, as this site states them (M253 spec 08).
 *
 * Three promises, each with a control that goes red:
 *
 * 1. The number comes from `PRICING_TRIAL_SCANS` and from nowhere else. A render with an odd
 *    number finds that number, and a render with no variable finds no trial sentence and no
 *    number at all. A site that typed a default would pass the first case and fail the second.
 * 2. No bundle promises the three day trial the core no longer grants. The pattern is proved on
 *    the sentence it replaced, so a pattern that stopped matching cannot pass on its own.
 * 3. Every "sign up" link opens the app's sign-up page. The href is read from the markup and
 *    compared with the constant, and the constant is compared with the literal address, so a
 *    constant that drifted to the app's front door fails too.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouterProvider, createStaticHandler, createStaticRouter, type RouteObject } from 'react-router';

import { TrialCopyFrame, type TrialCopySurface } from './lib/trial-copy-frame';

import { LANGUAGE_PREFIXES, SUPPORTED_LANGUAGES, type LanguageCode } from '../../app/i18n/language';
import {
  PRICE_ENV_VAR,
  TRIAL_SCANS_ENV_VAR,
  parseTrialScans,
  trialScansFromEnvironment,
} from '../../app/pricing-config';
import { APP_SIGN_UP_URL, APP_URL, SITE_ORIGIN } from '../../app/site';

const ROOT = resolve(import.meta.dirname, '../..');

/** The number production sets, and an odd one no sentence would ever carry by accident. */
const PRODUCTION_SCANS = 10;
const ODD_SCANS = 37;

/** One of the trial sentences as the prerender draws it, in `language`. */
async function renderTrialCopy(options: {
  language: LanguageCode;
  surface: TrialCopySurface;
  trialScans: number | null;
}): Promise<string> {
  const { language, surface, trialScans } = options;
  const routeObjects: RouteObject[] = [
    {
      id: 'root',
      path: '/*',
      Component: () => createElement(TrialCopyFrame, { language, surface, trialScans }),
    },
  ];
  const handler = createStaticHandler(routeObjects);
  const context = await handler.query(new Request(`${SITE_ORIGIN}${LANGUAGE_PREFIXES[language]}/`));
  if (context instanceof Response) throw new Error(`the copy answered ${context.status}, not a page`);
  const router = createStaticRouter(handler.dataRoutes, context);
  return renderToString(createElement(StaticRouterProvider, { router, context, hydrate: false }));
}

/**
 * The words a reader sees: the markup with its tags removed.
 *
 * Character references go too, because React writes an apostrophe as `&#x27;`, and a French
 * "l'instance" would otherwise read as the number 27.
 */
function visibleText(markup: string): string {
  return markup.replaceAll(/<[^>]+>/g, '').replaceAll(/&#?\w+;/g, ' ');
}

/** Every whole number in `text`, so "37" is found and the "10" inside "2010" is not. */
function numbersIn(text: string): number[] {
  return [...text.matchAll(/\d+/g)].map((match) => Number(match[0]));
}

/** Every href in the markup. */
function hrefsIn(markup: string): string[] {
  return [...markup.matchAll(/href="([^"]+)"/g)].map((match) => match[1] ?? '');
}

describe('parseTrialScans', () => {
  it('reads an unset and an empty variable as no trial', () => {
    assert.equal(parseTrialScans(undefined), null);
    assert.equal(parseTrialScans(''), null);
    assert.equal(parseTrialScans('   '), null);
  });

  it('reads a whole number of scans', () => {
    assert.equal(parseTrialScans('10'), PRODUCTION_SCANS);
    assert.equal(parseTrialScans(' 37 '), ODD_SCANS);
  });

  it('throws on a value that is present and not a positive whole number, naming its variable', () => {
    // The control for the two cases above: a typo in the deploy variable must fail the build,
    // not ship a site that silently states no trial.
    for (const raw of ['0', '-1', '1.5', '010', 'ten', '10 scans']) {
      assert.throws(() => parseTrialScans(raw), new RegExp(TRIAL_SCANS_ENV_VAR), raw);
      assert.throws(() => parseTrialScans(raw), (error: Error) => !error.message.includes(PRICE_ENV_VAR), raw);
    }
  });
});

describe('trialScansFromEnvironment', () => {
  it(`reads ${TRIAL_SCANS_ENV_VAR} from the build environment, and nothing when it is unset`, () => {
    const saved = process.env[TRIAL_SCANS_ENV_VAR];
    try {
      process.env[TRIAL_SCANS_ENV_VAR] = String(ODD_SCANS);
      assert.equal(trialScansFromEnvironment(), ODD_SCANS);

      delete process.env[TRIAL_SCANS_ENV_VAR];
      assert.equal(trialScansFromEnvironment(), null);
    } finally {
      if (saved === undefined) delete process.env[TRIAL_SCANS_ENV_VAR];
      else process.env[TRIAL_SCANS_ENV_VAR] = saved;
    }
  });
});

/** Whether a Dockerfile hands the build variable `name` to the build stage: an ARG and its ENV. */
function passesToBuild(options: { dockerfile: string; name: string }): boolean {
  const { dockerfile, name } = options;
  const lines = new Set(dockerfile.split('\n').map((line) => line.trim()));
  return lines.has(`ARG ${name}`) && lines.has(`ENV ${name}=$${name}`);
}

describe('the Dockerfile', () => {
  const dockerfile = readFileSync(resolve(ROOT, 'Dockerfile'), 'utf8');

  it(`passes ${TRIAL_SCANS_ENV_VAR} to the build, as it passes the price`, () => {
    assert.ok(passesToBuild({ dockerfile, name: TRIAL_SCANS_ENV_VAR }), `no ARG and ENV pair for ${TRIAL_SCANS_ENV_VAR}`);
    assert.ok(passesToBuild({ dockerfile, name: PRICE_ENV_VAR }), `no ARG and ENV pair for ${PRICE_ENV_VAR}`);
  });

  it('would fail on a Dockerfile with the ARG and no ENV', () => {
    // The control: an ARG alone never reaches `process.env` in the RUN that builds the site.
    const armed = dockerfile.replace(`ENV ${TRIAL_SCANS_ENV_VAR}=$${TRIAL_SCANS_ENV_VAR}`, '');
    assert.equal(passesToBuild({ dockerfile: armed, name: TRIAL_SCANS_ENV_VAR }), false);
  });
});

describe('the pricing page trial sentence', () => {
  for (const language of SUPPORTED_LANGUAGES) {
    it(`carries the build's number in ${language}, and only that number`, async () => {
      const markup = await renderTrialCopy({ language, surface: 'pricing', trialScans: ODD_SCANS });
      assert.deepEqual(numbersIn(visibleText(markup)), [ODD_SCANS], markup);
    });

    it(`is not drawn at all in ${language} when the build names no scans`, async () => {
      // The control for the case above: the same render with a number finds it, so an empty
      // render here is the sentence being absent and not the renderer being blind.
      const markup = await renderTrialCopy({ language, surface: 'pricing', trialScans: null });
      assert.equal(markup, '');
    });
  }
});

describe("the front page's access paragraph", () => {
  for (const language of SUPPORTED_LANGUAGES) {
    it(`names the build's number in ${language}`, async () => {
      const markup = await renderTrialCopy({ language, surface: 'access', trialScans: ODD_SCANS });
      assert.deepEqual(numbersIn(visibleText(markup)), [ODD_SCANS], markup);
    });

    it(`names no number in ${language} when the build names no scans`, async () => {
      // The control: the paragraph is still drawn, so an empty list here is no number in the
      // words and not an empty render.
      const markup = await renderTrialCopy({ language, surface: 'access', trialScans: null });
      assert.ok(visibleText(markup).length > 100, markup);
      assert.deepEqual(numbersIn(visibleText(markup)), []);
    });
  }
});

describe('the sign-up link', () => {
  it("is the app's sign-up page", () => {
    assert.equal(APP_SIGN_UP_URL, 'https://app.openplate.de/sign-up');
    assert.notEqual(APP_SIGN_UP_URL, APP_URL);
  });

  for (const language of SUPPORTED_LANGUAGES) {
    it(`opens it from both sentences in ${language}`, async () => {
      for (const surface of ['pricing', 'access'] as const) {
        const markup = await renderTrialCopy({ language, surface, trialScans: PRODUCTION_SCANS });
        assert.ok(hrefsIn(markup).includes(APP_SIGN_UP_URL), `${language} ${surface}: ${markup}`);
      }
    });
  }

  it('is also there when the build names no scans', async () => {
    const markup = await renderTrialCopy({ language: 'en', surface: 'access', trialScans: null });
    assert.ok(hrefsIn(markup).includes(APP_SIGN_UP_URL), markup);
  });

  it('would fail on a sentence that links the front door instead', () => {
    // The control for the href read: a link to the app itself is not the sign-up page.
    assert.equal(hrefsIn(`<a href="${APP_URL}">sign up</a>`).includes(APP_SIGN_UP_URL), false);
  });
});

describe('the bundles', () => {
  /** The three day trial, in the words each bundle used for it. */
  const THREE_DAYS = /three-day|three days|3-day|3 days|dreitägig|drei Tage|3 Tage|trois jours|3 jours|tre giorni|3 giorni|tres días|3 días|üç gün|3 gün/i;

  it('would catch the sentence this milestone replaced', () => {
    // The control: the pattern still matches the old English promise.
    assert.match('A new account on the hosted instance gets a free three-day trial.', THREE_DAYS);
  });

  for (const language of SUPPORTED_LANGUAGES) {
    it(`promise no three day trial in ${language}`, () => {
      const bundle = readFileSync(resolve(ROOT, 'app/i18n/locales', language, 'common.json'), 'utf8');
      assert.doesNotMatch(bundle, THREE_DAYS);
    });
  }
});
