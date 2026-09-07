/**
 * The header's one control: the appearance.
 *
 * ── IT SAYS WHAT IT WILL DO, AND CSS IS WHAT DECIDES WHICH ──
 * Both labels are in the markup and the `dark:` variant hides one of them.
 * That is not a trick to save a state hook: this document is prerendered to a
 * file, so the server has no idea which appearance the reader will get, and a
 * button whose text came from `localStorage` would be one thing in the HTML and
 * another after hydration. Rendering both and letting the stylesheet choose
 * makes the server and the client agree on markup that is true either way.
 *
 * `display: none` and not `sr-only` for the hidden half, which is the point:
 * the accessible name of a button is computed from what is actually rendered,
 * so a screen reader gets one sentence, the one that matches the screen.
 *
 * The words are hidden from sight and read aloud. A four word sentence beside
 * the nav would be the widest thing in the header and would say something the
 * icon already says to anybody who can see it.
 */
import { useTranslation } from 'react-i18next';

import { MoonIcon, SunIcon } from './icons';
import { toggleTheme } from '#app/lib/theme';

/** Big enough to hit with a thumb, and the same muted-to-foreground behaviour as a nav link. */
const BUTTON =
  'flex items-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground';

export function ThemeToggle() {
  const { t } = useTranslation();

  return (
    <button type="button" onClick={toggleTheme} className={BUTTON}>
      <span className="flex dark:hidden">
        <MoonIcon className="h-5 w-5" />
        <span className="sr-only">{t('site.theme.toDark')}</span>
      </span>
      <span className="hidden dark:flex">
        <SunIcon className="h-5 w-5" />
        <span className="sr-only">{t('site.theme.toLight')}</span>
      </span>
    </button>
  );
}
