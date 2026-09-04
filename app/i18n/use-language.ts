/**
 * The language of the document currently being rendered, read from the URL.
 *
 * A hook rather than a context value so it works in `root.tsx`'s `Layout`,
 * which renders above the provider and still has to stamp `<html lang>`.
 */
import { useLocation } from 'react-router';

import { languageFromPathname, type LanguageCode } from './language';

export function useLanguage(): LanguageCode {
  const { pathname } = useLocation();
  return languageFromPathname(pathname);
}
