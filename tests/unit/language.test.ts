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
  LANGUAGE_PREFIXES,
  PREFIXED_LANGUAGES,
  SUPPORTED_LANGUAGES,
  languageFromPathname,
  localizePath,
} from '../../app/i18n/language';

describe('languageFromPathname', () => {
  it('reads the default language from an unprefixed path', () => {
    assert.equal(languageFromPathname('/'), DEFAULT_LANGUAGE);
    assert.equal(languageFromPathname('/docs'), DEFAULT_LANGUAGE);
    assert.equal(languageFromPathname('/docs/app/getting-started'), DEFAULT_LANGUAGE);
  });

  it('reads a prefixed language from its own root and from a page under it', () => {
    assert.equal(languageFromPathname('/de'), 'de');
    assert.equal(languageFromPathname('/de/docs'), 'de');
  });

  it('matches the prefix as a whole segment, not as a string prefix', () => {
    // '/design' starts with '/de'. It is an English page and must stay one.
    assert.equal(languageFromPathname('/design'), DEFAULT_LANGUAGE);
    assert.equal(languageFromPathname('/dependencies/de'), DEFAULT_LANGUAGE);
  });
});

describe('localizePath', () => {
  it('leaves a path untouched for the default language', () => {
    assert.equal(localizePath('/', DEFAULT_LANGUAGE), '/');
    assert.equal(localizePath('/docs', DEFAULT_LANGUAGE), '/docs');
  });

  it('does not leave a trailing slash on a language root', () => {
    assert.equal(localizePath('/', 'de'), '/de');
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
  it('gives the default language no prefix and every other language one', () => {
    assert.equal(LANGUAGE_PREFIXES[DEFAULT_LANGUAGE], '');

    for (const language of PREFIXED_LANGUAGES) {
      assert.notEqual(language, DEFAULT_LANGUAGE);
      assert.match(LANGUAGE_PREFIXES[language], /^\/[a-z-]+$/);
    }
  });
});
