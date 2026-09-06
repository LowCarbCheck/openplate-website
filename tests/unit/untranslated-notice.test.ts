/**
 * The language notice on a documentation page, pinned to the SOURCE language.
 *
 * The rule used to read `language === DEFAULT_LANGUAGE` and it was right while
 * the default and the source were both English. German owns the root now, so
 * that same line would hide the notice on every German page, which is the only
 * place it is owed, and print it on the English ones, which are the text every
 * translation is made from. Both mistakes still render a page, so nothing else
 * in the gate would catch the swap.
 *
 * The predicate is tested rather than the component: this repo renders nothing
 * in its test tier, and the predicate is where the decision lives.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { needsLanguageNotice } from '../../app/components/docs/untranslated-notice';
import { DEFAULT_LANGUAGE, SOURCE_LANGUAGE, SUPPORTED_LANGUAGES } from '../../app/i18n/language';

describe('needsLanguageNotice', () => {
  it('fires on a German page', () => {
    assert.equal(needsLanguageNotice('de'), true);
  });

  it('stays silent on an English page', () => {
    assert.equal(needsLanguageNotice('en'), false);
  });

  it('fires on a French page, which is the third language and not the second source', () => {
    // A third language is where a "is this the other one" rule would have been found out. The
    // predicate has never been a comparison against German, but a reader of the notice cannot
    // tell that from one case, and the whole failure this file exists for renders a page either
    // way.
    assert.equal(needsLanguageNotice('fr'), true);
  });

  it('fires on the default language, because the default is no longer the source', () => {
    // Written against the constants rather than the strings, so this case
    // follows the site if another language ever takes the root.
    assert.equal(needsLanguageNotice(DEFAULT_LANGUAGE), true);
    assert.equal(needsLanguageNotice(SOURCE_LANGUAGE), false);
  });

  it('is silent for exactly one language, the source', () => {
    const silent = SUPPORTED_LANGUAGES.filter((language) => !needsLanguageNotice(language));
    assert.deepEqual([...silent], [SOURCE_LANGUAGE]);
  });
});
