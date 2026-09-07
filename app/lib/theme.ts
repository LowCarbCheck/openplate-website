/**
 * The appearance the reader gets, and the one thing on this site that has state.
 *
 * ── THREE STATES, TWO OF THEM VISIBLE ──
 * The stored preference is `light`, `dark`, or ABSENT, and absent means "follow
 * the system". Absent is the default and the only state a first visit can be
 * in, which is why nothing is written to storage until somebody presses the
 * button. Pressing it stores the opposite of what is on the screen right now,
 * so the first press on a dark laptop gives light, and the site stops following
 * the system from then on.
 *
 * ── IT HAS TO RUN BEFORE THE FIRST PAINT, SO IT IS NOT A COMPONENT ──
 * Every page here is prerendered to a file. There is no request, no cookie and
 * no header the build could have read, so the document that leaves the server
 * cannot know the preference: only the browser does. A React effect learns it
 * after the first paint, which is a white page that turns dark, and that flash
 * is the whole reason `next-themes` and everything like it exists.
 *
 * So `THEME_SCRIPT` runs synchronously in `<head>`, before the body is parsed,
 * and writes `data-theme` onto `<html>`. `app/app.css` keys both the tokens and
 * the `dark:` variant to that attribute. React then hydrates markup that never
 * mentioned the theme, so there is nothing for it to mismatch: the button says
 * which way it will go with CSS, not with a value only the client knows.
 */
import { THEME_COLOR } from 'virtual:theme-colors';

/** The two appearances. Absent from storage is the third state and is not one of these. */
export type Theme = 'light' | 'dark';

/** Where the preference lives. Read by the head script by its literal spelling; keep the two together. */
export const THEME_STORAGE_KEY = 'openplate-theme';

/**
 * The id of the one live `theme-color` meta, which the head script creates and the button updates.
 *
 * It is NOT rendered by React. A `theme-color` tag needs a literal colour and a
 * browser takes the first one whose `media` matches, so a pair of media-scoped
 * tags cannot express an override: a reader who chose light on a dark system
 * would keep dark browser chrome. The pair is still in the document inside a
 * `<noscript>`, which is exactly the case where there is no override to have.
 */
export const THEME_COLOR_META_ID = 'openplate-theme-color';

/** The query every dark `<source>` in this site is written with, spelled once. */
const DARK_QUERY = '(prefers-color-scheme: dark)';

/** A media query no screen matches, which is how a `<source>` is switched off without removing it. */
const NEVER_QUERY = '(width < 0px)';

/** The appearance on the screen right now: the override if there is one, the system otherwise. */
export function resolvedTheme(): Theme {
  const stated = document.documentElement.dataset['theme'];
  if (stated === 'light' || stated === 'dark') return stated;
  return globalThis.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Paint one appearance: the attribute the stylesheet reads, and the colour the browser chrome uses. */
function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
  document.getElementById(THEME_COLOR_META_ID)?.setAttribute('content', THEME_COLOR[theme]);
}


/**
 * The `<picture>` sources, re-pointed at the appearance the reader actually has.
 *
 * ── A MEDIA QUERY CANNOT READ AN ATTRIBUTE, AND THIS SITE'S IMAGES ARE MEDIA QUERIES ──
 * Every screenshot and every diagram ships twice, a light file and a dark one, behind
 * `<source media="(prefers-color-scheme: dark)">`. That is the right mechanism when the system is
 * the only opinion: the reader downloads ONE of the two files, which is about 400 KB rather than
 * 800 KB on the front page. The override broke exactly that and nothing else: a reader on a dark
 * laptop who chose light got a light page carrying five dark screenshots and a dark diagram.
 *
 * So when, and only when, an override is set, the dark sources are made to match it: neutralised
 * for light, and stripped of the colour clause for dark so they win outright. The original query
 * is kept on the element in `data-media` and put back the moment the override goes away.
 *
 * WITH NO OVERRIDE THIS CHANGES NOTHING, which is the common case and the one that must stay free:
 * the markup the server sent is already correct, no attribute is touched, and no second file is
 * fetched. A reader who overrides pays for both copies of whatever is already on the screen, and
 * that is the honest price of asking for an appearance the picture was not chosen for.
 */
export function syncPicturesToTheme(): void {
  const override = document.documentElement.dataset['theme'];
  for (const source of document.querySelectorAll<HTMLSourceElement>('picture source[media]')) {
    const original = source.dataset['media'] ?? source.media;
    if (!original.includes(DARK_QUERY)) continue;
    source.dataset['media'] = original;
    if (override === 'dark') {
      // `(prefers-color-scheme: dark) and (min-width: 40rem)` becomes `(min-width: 40rem)`, and a
      // query that was nothing else becomes `all`. NOT `not all and ...`, which negates the whole
      // query and would match every screen the original did not.
      const rest = original.replace(DARK_QUERY, '').replace(/^\s*and\s+/, '').trim();
      source.media = rest === '' ? 'all' : rest;
      continue;
    }
    source.media = override === 'light' ? NEVER_QUERY : original;
  }
}

/** The button's whole job: take the opposite of what is on the screen, and keep it. */
export function toggleTheme(): void {
  const next: Theme = resolvedTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  syncPicturesToTheme();
  try {
    globalThis.localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // A browser that refuses storage still gets the theme it just asked for; it
    // only forgets it on the next page. Nothing here is worth an error for that.
  }
}

/**
 * The script the document runs before it paints anything.
 *
 * Written as a string and not compiled from the functions above on purpose: it
 * has to be inline in `<head>`, ahead of the module bundle, and a module import
 * is by definition later than that. It is small enough to read in full, and the
 * two names it shares with this file are passed in below rather than spelled
 * twice.
 *
 * A `try` around the whole of it because `localStorage` throws outright in some
 * privacy modes, and a document that fails to choose an appearance must still
 * be a document.
 */
export const THEME_SCRIPT = `(function(){try{
var key=${JSON.stringify(THEME_STORAGE_KEY)};
var root=document.documentElement;
var stored=localStorage.getItem(key);
if(stored==='light'||stored==='dark')root.dataset.theme=stored;
var dark=(stored==='light'||stored==='dark'?stored:matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')==='dark';
var meta=document.createElement('meta');
meta.id=${JSON.stringify(THEME_COLOR_META_ID)};
meta.name='theme-color';
meta.content=dark?${JSON.stringify(THEME_COLOR.dark)}:${JSON.stringify(THEME_COLOR.light)};
document.head.appendChild(meta);
}catch(e){}})();`;
