/**
 * shots.ts, the product screenshots this site serves, and the whole list of them.
 *
 * The pictures are captured in the APPLICATION repository, by
 * `openplate/scripts/capture-landing.ts`, once per interface language, and they arrive here through
 * `pnpm sync:shots` at a pinned ref. This module is the manifest both ends read: the sync copies
 * exactly what is named below and prunes everything else, and the components below `app/components/`
 * ask it for a path. One list, so a file that reaches `public/shots/` is a file some page draws, and
 * a file some page draws is a file the sync will refuse to leave behind.
 *
 * ── THE SET IS PER LANGUAGE BECAUSE THE INTERFACE IN THE PICTURE IS ──
 * openplate.de answers in German first. A German paragraph wrapped around a screenshot of an
 * English sidebar is the same defect this milestone is removing from the prose, only louder,
 * because a picture is read before a sentence is. So the language of the URL picks the set.
 *
 * ── THE SYNC SCREEN IS CAPTURED UPSTREAM AND IS DELIBERATELY NOT ON THIS LIST ──
 * `/settings/sync` has redirected to `/settings/account` since M192, and signed out that screen
 * says only that you are signed out. The capture is honest and it illustrates nothing: a reader
 * looking at it learns that openplate has a settings page. Sync is told on this site by the
 * topology diagram out of `openplate/docs/architecture.md`, which shows the ciphertext leaving the
 * device and the photo not going near the server, and that is the better picture of it anyway.
 * Leaving the file uncopied is deliberate, not an oversight: see `scripts/sync-shots.ts`.
 *
 * Client-safe. Plain data and string work, no server imports, no `document`.
 */
import { SOURCE_LANGUAGE, type LanguageCode } from '../i18n/language';

/** Where the synced files live, under `public/`. The sync owns this directory and prunes it. */
export const SHOTS_DIR = '/shots';

/**
 * The languages a full set of captures exists in.
 *
 * A subset of `SUPPORTED_LANGUAGES`, and the two lists are allowed to differ: adding a third
 * language to the site is one afternoon of copy and a translation pass, while adding a third set of
 * captures means booting the app in that language and re-rendering sixteen screens. `shotLocale`
 * below is what makes the gap survivable, and the test on it is what makes it visible.
 */
export const SHOT_LOCALES = ['de', 'en'] as const satisfies readonly LanguageCode[];

export type ShotLocale = (typeof SHOT_LOCALES)[number];

/**
 * The language whose captures stand in when a reader's own language has none.
 *
 * English, and for the same reason it is `SOURCE_LANGUAGE` everywhere else: it is the language the
 * upstream repositories are written in, so it is the one set guaranteed to exist. It is also
 * exactly the fallback the missing-key path already uses, so a page that has fallen back to English
 * copy does not then show a picture in a third language.
 */
export const SHOT_FALLBACK_LOCALE = SOURCE_LANGUAGE satisfies ShotLocale;

/** The two appearances every capture exists in, because this site's dark mode is a media query. */
export const SHOT_THEMES = ['light', 'dark'] as const;

export type ShotTheme = (typeof SHOT_THEMES)[number];

/** Every phone screen the site draws, in no particular order: the pages choose their own. */
export const SHOT_VIEWS = ['diary', 'add', 'scan', 'goals', 'overview'] as const;

export type ShotView = (typeof SHOT_VIEWS)[number];

/**
 * What one capture IS, as a matter of pixels, so a component never guesses.
 *
 * `height` is the intrinsic height of the 780 wide capture and it goes on the `<img>`: without it
 * the page reflows when the picture decodes, and these sit below a heading somebody is reading.
 *
 * `whole` is the honest half. A capture at 780x1688 is one 390x844 viewport at scale 2 of a page
 * that scrolls, so its bottom edge lands wherever the viewport did, mid-row and through half a
 * number. That edge needs softening or it reads as a broken file. A capture shorter than that is a
 * screen whose content ENDED, and softening the end of something that did not get cut is worse than
 * doing nothing: it fades out the app's own navigation bar and reads as a picture that failed to
 * load.
 */
export interface ShotSpec {
  /** Intrinsic pixel height of the capture. Every phone capture is 780 wide. */
  height: number;
  /** `true` when the capture shows a screen that ended, so nothing is cut and nothing is faded. */
  whole: boolean;
}

/** Every phone capture is this wide, because every one is a 390 point viewport at scale 2. */
export const PHONE_SHOT_WIDTH = 780;

export const SHOT_SPECS = {
  diary: { height: 1688, whole: false },
  add: { height: 1688, whole: false },
  // The scan screen offers to connect an AI provider and then stops, so the capture is the whole
  // screen down to the navigation bar. It is also the SHORTEST of the five, which is what makes it
  // the ratio every uniform row of shots is cut to; see `app/components/shot.tsx`.
  scan: { height: 1120, whole: true },
  goals: { height: 1688, whole: false },
  overview: { height: 1688, whole: false },
} as const satisfies Record<ShotView, ShotSpec>;

/**
 * The two widths the desktop diary capture exists at, for the hero.
 *
 * 2160 is the retina file and 1080 is what an ordinary laptop takes. Stated as a `srcSet` so the
 * browser picks, rather than as one file so every reader takes the big one.
 */
export const DESKTOP_SHOT_WIDTHS = [1080, 2160] as const;

/** The desktop capture's own ratio, 2160x1440, which the hero states in CSS as well. See `Hero`. */
export const DESKTOP_SHOT = { width: 2160, height: 1440 } as const;

/**
 * The reader's language, resolved to a language captures actually exist in.
 *
 * NOT A SILENT SUBSTITUTION, and that is the point of it being a function with a test rather than a
 * `??` at the call site. `tests/unit/shots.test.ts` asserts that every language the site ships copy
 * for resolves into `SHOT_LOCALES`, so the day a third language is added the gap is a failing test
 * naming it, and somebody decides whether to capture the set or to accept English pictures on
 * purpose. What is forbidden is finding out from a reader.
 */
function hasShots(language: LanguageCode): language is ShotLocale {
  // Widened on purpose. `SHOT_LOCALES.includes(language)` does not compile against a `LanguageCode`
  // that is not one of them, which is the exact question being asked. A predicate rather than an
  // assertion at the call site: the narrowing is then the compiler's conclusion and not our claim.
  const locales: readonly LanguageCode[] = SHOT_LOCALES;
  return locales.includes(language);
}

export function shotLocale(language: LanguageCode): ShotLocale {
  return hasShots(language) ? language : SHOT_FALLBACK_LOCALE;
}

/** The public path of one phone capture. */
export function phoneShotPath(locale: ShotLocale, view: ShotView, theme: ShotTheme): string {
  return `${SHOTS_DIR}/${locale}/${view}-mobile-${theme}.webp`;
}

/** The public path of the desktop diary capture at one of its two widths. */
export function desktopShotPath(locale: ShotLocale, theme: ShotTheme, width: number): string {
  const suffix = width === DESKTOP_SHOT.width ? '' : `-${width}`;
  return `${SHOTS_DIR}/${locale}/diary-desktop-${theme}${suffix}.webp`;
}

/**
 * Every file the sync must find upstream and leave here, as paths relative to `public/`.
 *
 * Derived from the three lists above rather than typed out, so a view added to `SHOT_VIEWS` is a
 * view the sync starts demanding and a view it starts pruning, in one edit.
 */
export function shotManifest(): string[] {
  const files: string[] = [];
  for (const locale of SHOT_LOCALES) {
    for (const theme of SHOT_THEMES) {
      for (const view of SHOT_VIEWS) files.push(phoneShotPath(locale, view, theme).slice(1));
      for (const width of DESKTOP_SHOT_WIDTHS) files.push(desktopShotPath(locale, theme, width).slice(1));
    }
  }
  return files.toSorted();
}
