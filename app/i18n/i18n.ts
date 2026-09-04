/**
 * i18n.ts, the shared i18next singleton.
 *
 * Both locale bundles are inline ESM imports, so they are part of the app
 * bundle: no runtime fetch and no loading state. That matters more here than in
 * an ordinary app, because the pages are prerendered: a bundle that had to be
 * fetched would leave every static HTML file with untranslated markup.
 *
 * TWO namespaces. `common` is the site's own copy. `docs` is the chrome around
 * the documentation — the contents rail, the edit link, the line that says a
 * German page is still in English — and it earns its own file by the rule the
 * first sentence of this note set: it is a body of strings read on the
 * documentation screens and on no other, and spec 03 translates it on a
 * different schedule from the rest of the site.
 *
 * There is no language detector. The URL prefix is the language
 * (`app/i18n/language.ts`), and it is passed in explicitly by `I18nProvider`.
 * A detector could only disagree with the path being rendered.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './language';
import deCommon from './locales/de/common.json';
import deDocs from './locales/de/docs.json';
import enCommon from './locales/en/common.json';
import enDocs from './locales/en/docs.json';

void i18next.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, docs: enDocs },
    de: { common: deCommon, docs: deDocs },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: [...SUPPORTED_LANGUAGES],
  defaultNS: 'common',
  ns: ['common', 'docs'],
  interpolation: {
    // React escapes for us.
    escapeValue: false,
  },
  react: {
    // Nothing loads asynchronously (see the module doc), so there is never a
    // suspending moment to fall back from.
    useSuspense: false,
  },
});

export default i18next;
