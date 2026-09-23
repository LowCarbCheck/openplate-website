/**
 * The page frame as a test renders it: the i18n provider around the site layout around one line.
 *
 * A `.tsx` of its own because the unit tier's glob takes `*.test.ts`, and JSX is the only way to
 * hand children to these two components that the linter accepts.
 */
import { I18nProvider } from '../../../app/i18n/I18nProvider';
import { SiteLayout } from '../../../app/components/site-layout';
import type { LanguageCode } from '../../../app/i18n/language';

export function PageFrame({ language }: { language: LanguageCode }) {
  return (
    <I18nProvider language={language}>
      <SiteLayout>
        <p>body</p>
      </SiteLayout>
    </I18nProvider>
  );
}
