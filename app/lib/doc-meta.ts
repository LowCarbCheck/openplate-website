/**
 * A page title for a route whose title is a translated string.
 *
 * `meta` is not a component, so it cannot call `useTranslation`. It is handed a
 * `location`, and on this site the location IS the language — so the language is
 * read from the path and passed to i18next explicitly. Reading the singleton's
 * current language instead would be reading whatever the last render left set,
 * which is not necessarily the document being written to disk.
 */
import type { Location } from 'react-router';

import i18n from '#app/i18n/i18n';
import { languageFromPathname } from '#app/i18n/language';

export function translatedTitle(location: Location, key: string): string {
  const language = languageFromPathname(location.pathname);
  return `${i18n.t(key, { lng: language, ns: 'docs' })} — openplate`;
}
