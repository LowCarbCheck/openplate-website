/**
 * The two trial sentences as a test renders them: the i18n provider around one of them.
 *
 * A `.tsx` of its own for the reason `page-frame.tsx` gives: the unit tier's glob takes
 * `*.test.ts`, and JSX is the only way to hand these props over that the linter accepts.
 */
import { I18nProvider } from '../../../app/i18n/I18nProvider';
import { AccessBody, PricingTrial } from '../../../app/components/trial-copy';
import type { LanguageCode } from '../../../app/i18n/language';

export type TrialCopySurface = 'pricing' | 'access';

export function TrialCopyFrame({
  language,
  surface,
  trialScans,
}: {
  language: LanguageCode;
  surface: TrialCopySurface;
  trialScans: number | null;
}) {
  return (
    <I18nProvider language={language}>
      {surface === 'pricing' && <PricingTrial trialScans={trialScans} />}
      {surface === 'access' && <AccessBody trialScans={trialScans} />}
    </I18nProvider>
  );
}
