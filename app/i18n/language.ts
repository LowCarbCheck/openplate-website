/**
 * language.ts, the site's language model. The URL is the whole of it.
 *
 * This site is prerendered to static HTML at build time, so the language cannot
 * come from a cookie, a header or a stored preference: those are read at
 * request time, and there is no request. Every page therefore exists twice, at
 * its English path and again under the `/de` prefix, and the prefix in the URL
 * IS the language. A crawler, a shared link and a browser back button all agree
 * on which document they are looking at, and both copies are cacheable forever.
 *
 * Client- and server-safe: plain string work, no `document`, no server imports.
 */

/** The languages the site ships copy for. `en` is the fallback for every missing key. */
export const SUPPORTED_LANGUAGES = ['en', 'de'] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * The language that owns the unprefixed paths, and the one answer when the
 * answer is otherwise unknown. `en` is the reference bundle, so it is both.
 */
export const DEFAULT_LANGUAGE = 'en' satisfies LanguageCode;

/** Native display names. A language is always named in its own language, never translated. */
export const LANGUAGE_LABELS = {
  en: 'English',
  de: 'Deutsch',
} satisfies Record<LanguageCode, string>;

/**
 * The URL prefix each language lives under. The default language has none, so
 * `openplate.de/docs` stays the canonical English URL rather than redirecting
 * to `/en/docs`.
 */
export const LANGUAGE_PREFIXES = {
  en: '',
  de: '/de',
} satisfies Record<LanguageCode, string>;

/** Every prefixed language, i.e. every one except the default. Drives the route table. */
export const PREFIXED_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (language) => language !== DEFAULT_LANGUAGE,
);

/**
 * The language a pathname is written in.
 *
 * Matches the prefix as a whole segment, so `/design` is English and only
 * `/de` and `/de/...` are German. Anything unrecognised is the default, which
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
 * `path` is always the canonical English-rooted path (`/docs`, `/`), because
 * that is what the route table is written in. Passing an already-prefixed path
 * would double the prefix, so callers hold the canonical form and localise at
 * the point of use.
 */
export function localizePath(path: string, language: LanguageCode): string {
  const prefix = LANGUAGE_PREFIXES[language];
  if (!prefix) return path;
  return path === '/' ? prefix : `${prefix}${path}`;
}

/**
 * The canonical, English-rooted path of an already-localized pathname.
 *
 * The inverse of `localizePath`, and the piece the language switcher needs:
 * it holds a German URL and has to name the same page in English before it can
 * localize it again. `/de/sync` becomes `/sync`, `/de` becomes `/`, and an
 * unprefixed path is already canonical.
 */
export function canonicalizePath(pathname: string): string {
  const prefix = LANGUAGE_PREFIXES[languageFromPathname(pathname)];
  if (!prefix) return pathname;

  const rest = pathname.slice(prefix.length);
  return rest === '' ? '/' : rest;
}
