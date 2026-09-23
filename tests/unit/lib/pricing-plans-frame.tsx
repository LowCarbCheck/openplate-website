/**
 * The pricing page's plan cards as a test renders them: the i18n provider around the cards.
 *
 * A `.tsx` of its own for the reason `page-frame.tsx` gives: the unit tier's glob takes
 * `*.test.ts`, and JSX is the only way to hand these props over that the linter accepts.
 */
import { I18nProvider } from '../../../app/i18n/I18nProvider';
import { PricingPlans } from '../../../app/components/pricing-plans';
import type { LanguageCode } from '../../../app/i18n/language';

export function PricingPlansFrame({
  language,
  priceEur,
  yearlyEur,
}: {
  language: LanguageCode;
  priceEur: string;
  yearlyEur: string | null;
}) {
  return (
    <I18nProvider language={language}>
      <PricingPlans priceEur={priceEur} yearlyEur={yearlyEur} />
    </I18nProvider>
  );
}
