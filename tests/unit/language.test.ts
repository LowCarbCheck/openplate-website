/**
 * The URL prefix is the only thing that decides a page's language on this site
 * (`app/i18n/language.ts`), and it decides it twice: once when the route table
 * is built and once when a rendered page reads it back. These cases pin the
 * two directions against each other.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DEFAULT_LANGUAGE,
  SOURCE_LANGUAGE,
  canonicalizePath,
  LANGUAGE_PREFIXES,
  PREFIXED_LANGUAGES,
  SUPPORTED_LANGUAGES,
  languageFromPathname,
  languageFromRequest,
  localizePath,
} from '../../app/i18n/language';

describe('languageFromPathname', () => {
  it('reads the default language from an unprefixed path', () => {
    assert.equal(languageFromPathname('/'), DEFAULT_LANGUAGE);
    assert.equal(languageFromPathname('/docs'), DEFAULT_LANGUAGE);
    assert.equal(languageFromPathname('/docs/app/getting-started'), DEFAULT_LANGUAGE);
  });

  it('reads a prefixed language from its own root and from a page under it', () => {
    assert.equal(languageFromPathname('/en'), 'en');
    assert.equal(languageFromPathname('/en/docs'), 'en');
  });

  it('matches the prefix as a whole segment, not as a string prefix', () => {
    // '/enterprise' starts with '/en'. It is a German page and must stay one.
    assert.equal(languageFromPathname('/enterprise'), DEFAULT_LANGUAGE);
    assert.equal(languageFromPathname('/dependencies/en'), DEFAULT_LANGUAGE);
  });
});

describe('localizePath', () => {
  it('leaves a path untouched for the default language', () => {
    assert.equal(localizePath('/', DEFAULT_LANGUAGE), '/');
    assert.equal(localizePath('/docs', DEFAULT_LANGUAGE), '/docs');
  });

  it('does not leave a trailing slash on a language root', () => {
    assert.equal(localizePath('/', 'en'), '/en');
  });

  it('round-trips: every page in every language reads back as that language', () => {
    const pages = ['/', '/app', '/docs', '/docs/app/getting-started', '/releases/app'];

    for (const language of SUPPORTED_LANGUAGES) {
      for (const page of pages) {
        assert.equal(languageFromPathname(localizePath(page, language)), language);
      }
    }
  });
});

describe('the language table', () => {
  it('serves German from the root and English from a prefix', () => {
    // The whole of spec 01 in four lines. A regression here is not a broken
    // link, it is the site answering the wrong language at every URL it has.
    assert.equal(DEFAULT_LANGUAGE, 'de');
    assert.equal(LANGUAGE_PREFIXES.de, '');
    assert.equal(LANGUAGE_PREFIXES.en, '/en');
    assert.deepEqual([...SUPPORTED_LANGUAGES], ['de', 'en']);
  });

  it('keeps the source language apart from the default one', () => {
    // They were one value while both were English. English is still the
    // hand-written bundle and the language the translator reads from, so it is
    // still the source; it is no longer the language of the root URL.
    assert.equal(SOURCE_LANGUAGE, 'en');
    assert.notEqual(SOURCE_LANGUAGE, DEFAULT_LANGUAGE);
  });

  it('names German first, because the switcher shows them in this order', () => {
    assert.equal(SUPPORTED_LANGUAGES[0], 'de');
  });

  it('gives the default language no prefix and every other language one', () => {
    assert.equal(LANGUAGE_PREFIXES[DEFAULT_LANGUAGE], '');

    for (const language of PREFIXED_LANGUAGES) {
      assert.notEqual(language, DEFAULT_LANGUAGE);
      assert.match(LANGUAGE_PREFIXES[language], /^\/[a-z-]+$/);
    }
  });
});

describe('canonicalizePath', () => {
  it('strips a language prefix and leaves an unprefixed path alone', () => {
    assert.equal(canonicalizePath('/en/sync'), '/sync');
    assert.equal(canonicalizePath('/sync'), '/sync');
  });

  it('turns a language root back into the site root', () => {
    assert.equal(canonicalizePath('/en'), '/');
    assert.equal(canonicalizePath('/'), '/');
  });

  it('undoes localizePath for every page in every language', () => {
    const pages = ['/', '/app', '/sync', '/docs/app/getting-started'];

    for (const language of SUPPORTED_LANGUAGES) {
      for (const page of pages) {
        assert.equal(canonicalizePath(localizePath(page, language)), page);
      }
    }
  });
});

describe('languageFromRequest', () => {
  // A loader is called at `<path>.data`, and the language root is the one URL where that
  // changes the answer: `/en.data` is neither `/en` nor a path under it. The English front page
  // was prerendered with German paragraphs inside an English frame because of this.
  it('reads the language of a language root asked for as data', () => {
    assert.equal(languageFromRequest('https://openplate.de/en.data'), 'en');
  });

  it('reads a page under a prefix, with the suffix and without', () => {
    assert.equal(languageFromRequest('https://openplate.de/en/app.data'), 'en');
    assert.equal(languageFromRequest('https://openplate.de/en/app'), 'en');
  });

  it('leaves an unprefixed page on the default language', () => {
    assert.equal(languageFromRequest('https://openplate.de/app.data'), 'de');
    assert.equal(languageFromRequest('https://openplate.de/.data'), 'de');
  });
});
