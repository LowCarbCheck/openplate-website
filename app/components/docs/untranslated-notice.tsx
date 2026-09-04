/**
 * One line, on a German page, about the language of the text under it.
 *
 * It says one of two things and never nothing:
 *   translated   the page was machine-translated, and here is where the English is.
 *   untranslated the page is English, and here is why.
 *
 * ── BOTH ARE OWED, AND THE SECOND IS NOT THE TEMPORARY ONE ──
 * Spec 03 translates the guides. It does not translate the release notes: three
 * CHANGELOGs are a third of the corpus and the least of it to a reader, so
 * `/releases/<component>` still renders English on a German URL, deliberately
 * and for as long as that stays the right trade. A page synced an hour ago is
 * the same case in miniature, with its new sentences in English under a German
 * heading.
 *
 * The notice is rendered by the language of the URL and by nothing else, which
 * is the same rule every other language decision on this site follows.
 */
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';

export function UntranslatedNotice({ translated }: { translated?: boolean }) {
  const language = useLanguage();
  const { t } = useTranslation('docs');

  if (language === DEFAULT_LANGUAGE) return null;

  return (
    <p className="mt-6 max-w-[68ch] rounded-sm border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
      {t(translated === true ? 'machineTranslated' : 'untranslated')}
    </p>
  );
}
