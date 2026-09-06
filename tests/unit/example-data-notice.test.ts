/**
 * Wherever a page shows a product screenshot, it says the food in it is nobody's.
 *
 * ── WHY THIS IS SOURCE INSPECTION AND NOT A RENDER ──
 * This repository renders nothing in its test tier, by choice: the pages are prerendered React
 * Router routes and standing up a router, a provider and an i18next instance to assert one sentence
 * would test the harness. The rule is about a page's COMPOSITION, which is a property of the route
 * file, and the route file is what is read here. `untranslated-notice.test.ts` takes the same shape
 * for the same reason.
 *
 * ── WHY THE RULE EXISTS ──
 * The captures show a diary full of food that nobody ate, made by a seeding script. A reader who
 * scrolls past a screenshot has already believed it, so the sentence has to be in the same view as
 * the picture and not in a footnote at the bottom of the page. `ExampleDataNote` is that sentence,
 * written once so two pages cannot say it two different ways.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

import i18n from '../../app/i18n/i18n';
import { SUPPORTED_LANGUAGES } from '../../app/i18n/language';

const ROUTES_DIR = resolve(import.meta.dirname, '../../app/routes');

/** The module every screenshot on this site comes out of. Importing it IS showing a screenshot. */
const SHOT_MODULE = '#app/components/shot';

/** The key `ExampleDataNote` prints. Named here so a rename cannot quietly empty the notice. */
const NOTICE_KEY = 'site.exampleData';

interface Route {
  name: string;
  source: string;
}

function routes(): Route[] {
  return readdirSync(ROUTES_DIR)
    .filter((name) => name.endsWith('.tsx'))
    .map((name) => ({ name, source: readFileSync(join(ROUTES_DIR, name), 'utf8') }));
}

describe('every page that shows a screenshot', () => {
  const showing = routes().filter((route) => route.source.includes(SHOT_MODULE));

  it('is at least one page, or this file is checking nothing', () => {
    // The failure mode a source-inspection test has that a render test does not: a rename in the
    // component tree turns every case below into a loop over an empty list, which passes.
    assert.ok(showing.length > 0, `no route imports from ${SHOT_MODULE}`);
  });

  for (const route of showing) {
    it(`says the data is an example: ${route.name}`, () => {
      assert.match(
        route.source,
        /<ExampleDataNote\b/,
        `${route.name} draws a screenshot without saying the diary in it is made up`,
      );
    });
  }
});

describe('the notice itself', () => {
  it('is a sentence in every language, not a missing key', () => {
    // ASKED OF THE REAL i18next INSTANCE, with `fallbackLng: false`. The singleton falls back to
    // English for a missing key, which is right for a reader and useless here: without turning it
    // off, a German bundle with no notice in it passes by answering in English.
    for (const language of SUPPORTED_LANGUAGES) {
      assert.ok(i18n.exists(NOTICE_KEY, { lng: language, fallbackLng: false }), `${language} has no ${NOTICE_KEY}`);
      const sentence = i18n.getFixedT(language)(NOTICE_KEY);
      assert.ok(sentence.length > 20, `${language}'s ${NOTICE_KEY} is too short to be a sentence`);
    }
  });
});
