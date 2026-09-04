/**
 * I18nProvider.tsx bridges the URL-resolved language into react-i18next, for
 * the prerender pass and for the hydrated client alike.
 *
 * `i18n` (./i18n.ts) is a MODULE-SCOPED SINGLETON, one per Node process. During
 * a build the prerenderer renders many URLs in that one process, English and
 * German among them, so calling `i18n.changeLanguage()` there would let one
 * page's language leak into the next page's HTML. The two sides differ:
 *
 *   - SERVER (and the prerender pass): each render gets its own
 *     `i18n.cloneInstance({ lng })`. The clone shares the already-parsed
 *     resource store but owns its `language`, so nothing it does is visible to
 *     the next document.
 *
 *   - CLIENT: one tab per instance, so mutating the singleton is safe. It is
 *     synced INLINE during render rather than in an effect, because an effect
 *     runs a tick too late, after a mismatched first paint has committed.
 *     `changeLanguage()` resolves synchronously because both bundles are inline
 *     ESM imports.
 */
import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';

import i18n from './i18n';
import type { LanguageCode } from './language';

export function I18nProvider({ language, children }: { language: LanguageCode; children: ReactNode }) {
  const isServer = globalThis.document === undefined;

  if (!isServer && i18n.language !== language) {
    void i18n.changeLanguage(language);
  }

  const instance = isServer ? i18n.cloneInstance({ lng: language }) : i18n;

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}
