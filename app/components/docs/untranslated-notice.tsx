/**
 * One line, on a page that is not in the source language, about the language of
 * the text under it.
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
 *
 * ── THE TEST IS SOURCE_LANGUAGE, NOT DEFAULT_LANGUAGE ──
 * The two were the same value until German took the root, and the difference is
 * the whole meaning of this component. An English page needs no notice: it is
 * the text the documentation was written in. A German page always needs one,
 * whether its sentences came back from the translator or are still waiting.
 * DEFAULT_LANGUAGE is German now, so asking it here would suppress the notice
 * on exactly the pages that owe it and print it on the English ones.
 */
import { useTranslation } from 'react-i18next';

import { SOURCE_LANGUAGE, type LanguageCode } from '#app/i18n/language';
import { useLanguage } from '#app/i18n/use-language';

/**
 * Exported so the rule above can be pinned by a test. This repo renders no
 * components in its test tier, so a predicate is the only part of the notice
 * a case can hold on to, and it is the part that carries the mistake.
 */
export function needsLanguageNotice(language: LanguageCode): boolean {
  return language !== SOURCE_LANGUAGE;
}

export function UntranslatedNotice({ translated }: { translated?: boolean }) {
  const language = useLanguage();
  const { t } = useTranslation('docs');

  if (!needsLanguageNotice(language)) return null;

  return (
    <p className="mt-6 max-w-[68ch] rounded-sm border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
      {t(translated === true ? 'machineTranslated' : 'untranslated')}
    </p>
  );
}
