/**
 * The screenshot manifest, and the one decision in it a reader could be hurt by.
 *
 * This repo renders nothing in its test tier, so what is tested here is the DATA and the predicate,
 * which is where both decisions live: which files exist, and which language's set a reader gets.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from '../../app/i18n/language';
import {
  SHOT_FALLBACK_LOCALE,
  SHOT_LOCALES,
  SHOT_SPECS,
  SHOT_VIEWS,
  shotLocale,
  shotManifest,
} from '../../app/lib/shots';

describe('the language of the picture', () => {
  it('gives a reader their own language when captures exist in it', () => {
    for (const locale of SHOT_LOCALES) assert.equal(shotLocale(locale), locale);
  });

  it('falls back to the source language and to nothing else', () => {
    assert.equal(SHOT_FALLBACK_LOCALE, SOURCE_LANGUAGE);
  });

  /**
   * THE GAP THIS FILE EXISTS FOR.
   *
   * A language can be added to the site in an afternoon of copy; a set of captures means booting
   * the application in that language and re-rendering every screen. So the two lists are allowed to
   * come apart, and this is where they are looked at. When this fails, the reading is not "the
   * fallback is broken": it is "the site now ships a language whose readers will see English
   * screenshots". Somebody decides between capturing the set and accepting that, and writes the
   * decision down. What is forbidden is finding out from a reader.
   *
   * ── THE DECISION, TAKEN FOR FRENCH IN M197 ──
   * Accepted, deliberately, and it is the first time this list has had a member. The captures come
   * from `openplate/scripts/capture-landing.ts`, which renders the APPLICATION, and the application
   * ships German and English interfaces and no French one. There is no French screenshot to sync
   * because there is no French screen to photograph, so capturing the set is not a job on this
   * repository at all: it is a translation of the app, and it is not what this milestone is. Until
   * then a French page shows the English captures under French prose, which is a visible seam and
   * is written down here rather than found by a reader. Remove `fr` from this list the day the app
   * speaks it.
   */
  const SHOWN_ENGLISH_CAPTURES = ['fr'];

  it('has captures for every language the site ships copy for, or a decision on record', () => {
    const uncaptured = SUPPORTED_LANGUAGES.filter((language) => shotLocale(language) !== language);
    assert.deepEqual([...uncaptured], SHOWN_ENGLISH_CAPTURES, 'these languages would be shown English screenshots');
  });
});

describe('the files the manifest names', () => {
  it('are all on disk, so no page can point at a hole', () => {
    // `pnpm sync:shots` is what puts them there and it is what fails when a capture is missing
    // upstream. This is the other end of that promise: the committed tree matches the manifest the
    // components read, checked without running a sync or reaching a network.
    const missing = shotManifest().filter((file) => !existsSync(resolve(import.meta.dirname, '../../public', file)));
    assert.deepEqual(missing, []);
  });
});

describe('what a capture is, as a matter of pixels', () => {
  it('describes every view', () => {
    for (const view of SHOT_VIEWS) assert.ok(SHOT_SPECS[view].height > 0, view);
  });

  /**
   * The ratio every row of shots is cut to is the SHORTEST capture's, and `app/components/shot.tsx`
   * writes that ratio out as a Tailwind class because a class cannot be computed. This is the check
   * that the class still describes the shortest one: if a screen grows past the scan screen, a row
   * starts scaling a capture UP and cropping its sides, which is a blurrier picture of less.
   */
  it('leaves the scan screen the shortest, which is the ratio a row is cut to', () => {
    const shortest = SHOT_VIEWS.toSorted((a, b) => SHOT_SPECS[a].height - SHOT_SPECS[b].height)[0];
    assert.equal(shortest, 'scan');
    assert.equal(SHOT_SPECS.scan.height, 1120, 'aspect-[39/56] in shot.tsx is 780x1120 reduced');
  });

  it('fades exactly the captures that were cut', () => {
    // A capture one viewport tall ends mid-row and is faded; a shorter one is a screen that ended
    // and is not. Fading the end of something that was not cut fades out the app's own navigation
    // bar, which reads as a picture that failed to load.
    const whole = SHOT_VIEWS.filter((view) => SHOT_SPECS[view].whole);
    assert.deepEqual(whole, ['scan']);
  });
});
