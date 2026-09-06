/**
 * language.ts, the site's language model. The URL is the whole of it.
 *
 * This site is prerendered to static HTML at build time, so the language cannot
 * come from a cookie, a header or a stored preference: those are read at
 * request time, and there is no request. Every page therefore exists twice, at
 * its German path and again under the `/en` prefix, and the prefix in the URL
 * IS the language. A crawler, a shared link and a browser back button all agree
 * on which document they are looking at, and both copies are cacheable forever.
 *
 * ── THE DEFAULT LANGUAGE AND THE SOURCE LANGUAGE ARE NOT THE SAME THING ──
 * They were the same value while both were `en`, and reading one where the
 * other was meant cost nothing. German now owns the root, so the two have come
 * apart and every reader of this module has to say which one it wants:
 *
 *   DEFAULT_LANGUAGE  German. It owns the unprefixed URLs, so `openplate.de/docs`
 *                     IS the German document, and it is the language of any path
 *                     that carries no prefix. This is a question about the URL.
 *   SOURCE_LANGUAGE   English. It is the hand-written bundle, it is the language
 *                     the upstream repositories write their documentation in,
 *                     and it is the key the translation memory is stored under.
 *                     So it stays the fallback for a missing key and the text a
 *                     translation is made from. This is a question about the
 *                     words, not about where they are served.
 *
 * The rule of thumb: ask for DEFAULT_LANGUAGE when you are routing, ask for
 * SOURCE_LANGUAGE when you are translating. A check that reads "is this the
 * default language" and means "is this page untranslated" is now backwards, and
 * it fails silently, because both branches still render.
 *
 * Client- and server-safe: plain string work, no `document`, no server imports.
 */

/** The languages the site ships copy for, in the order the switcher names them. */
export const SUPPORTED_LANGUAGES = ['de', 'en'] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * The language that owns the unprefixed paths, and the one answer when a path
 * names no language at all.
 */
export const DEFAULT_LANGUAGE = 'de' satisfies LanguageCode;

/**
 * The language every other language is made from, and the fallback for a key
 * that is missing everywhere else. See the module note above: this is the
 * hand-written bundle, not the language of the root URL.
 */
export const SOURCE_LANGUAGE = 'en' satisfies LanguageCode;

/** Native display names. A language is always named in its own language, never translated. */
export const LANGUAGE_LABELS = {
  de: 'Deutsch',
  en: 'English',
} satisfies Record<LanguageCode, string>;

/**
 * The URL prefix each language lives under. The default language has none, so
 * `openplate.de/docs` stays the canonical German URL rather than redirecting
 * to `/de/docs`, and English answers at `/en/docs`.
 */
export const LANGUAGE_PREFIXES = {
  de: '',
  en: '/en',
} satisfies Record<LanguageCode, string>;

/** Every prefixed language, i.e. every one except the default. Drives the route table. */
export const PREFIXED_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (language) => language !== DEFAULT_LANGUAGE,
);

/**
 * The language a pathname is written in.
 *
 * Matches the prefix as a whole segment, so `/enterprise` is German and only
 * `/en` and `/en/...` are English. Anything unrecognised is the default, which
 * is also what the router does with the same path.
 */
export function languageFromPathname(pathname: string): LanguageCode {
  for (const language of PREFIXED_LANGUAGES) {
    const prefix = LANGUAGE_PREFIXES[language];
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return language;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * The same page, addressed in `language`.
 *
 * `path` is always the canonical unprefixed path (`/docs`, `/`), because that
 * is what the route table is written in. Passing an already-prefixed path
 * would double the prefix, so callers hold the canonical form and localise at
 * the point of use.
 */
export function localizePath(path: string, language: LanguageCode): string {
  const prefix = LANGUAGE_PREFIXES[language];
  if (!prefix) return path;
  return path === '/' ? prefix : `${prefix}${path}`;
}

/**
 * The canonical, unprefixed path of an already-localized pathname.
 *
 * The inverse of `localizePath`, and the piece the language switcher needs:
 * it holds an English URL and has to name the same page unprefixed before it
 * can localize it again. `/en/sync` becomes `/sync`, `/en` becomes `/`, and an
 * unprefixed path is already canonical.
 */
export function canonicalizePath(pathname: string): string {
  const prefix = LANGUAGE_PREFIXES[languageFromPathname(pathname)];
  if (!prefix) return pathname;

  const rest = pathname.slice(prefix.length);
  return rest === '' ? '/' : rest;
}
