/**
 * One line, on a German documentation page, saying the text under it is English.
 *
 * TEMPORARY AND DELIBERATELY SO. Spec 03 translates the parsed tree sentence by
 * sentence; until it lands, `/de/docs/...` renders the English blocks, and a
 * reader who followed a German link is owed the reason rather than left to work
 * it out. It is one line and not a banner: the page below it is the thing they
 * came for and it is readable.
 *
 * The notice is rendered by the language of the URL and by nothing else, which
 * is the same rule every other language decision on this site follows.
 */
import { useTranslation } from 'react-i18next';

import { DEFAULT_LANGUAGE } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';

export function UntranslatedNotice() {
  const language = useLanguage();
  const { t } = useTranslation('docs');

  if (language === DEFAULT_LANGUAGE) return null;

  return (
    <p className="mt-6 max-w-[68ch] rounded-sm border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
      {t('untranslated')}
    </p>
  );
}
