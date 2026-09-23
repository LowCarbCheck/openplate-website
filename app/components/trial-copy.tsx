/**
 * The two places this site states what a new account on the hosted instance gets (M253).
 *
 * ── THE NUMBER IS A BUILD VARIABLE, AND THE SENTENCE FOLLOWS IT ──
 * `PRICING_TRIAL_SCANS` (`app/pricing-config.ts`) is how many free AI scans a
 * new account gets. Both components take it as `trialScans`, and null means the
 * build was told no number: the pricing page then draws no trial sentence at
 * all, and the front page draws the access paragraph that names no trial. There
 * is no default, because a number this site made up is a promise the core that
 * counts the scans may not keep.
 *
 * A component file of its own rather than two routes' bodies, so a unit test can
 * render each with a number and without one and read the difference. The routes
 * cannot be rendered that way: their loaders read the build environment.
 * `tests/unit/landing-claims.test.ts` reads this file too, since the front page's
 * access keys are printed here and not in `home.tsx`.
 *
 * Every "sign up" in these sentences is a `<signUp>` tag, and it links
 * `APP_SIGN_UP_URL`, the app's own sign-up page.
 */
import { Trans } from 'react-i18next';

import { ExternalLink, SiteLink } from '#app/components/site-link';
import { APP_SIGN_UP_URL, DOC_PATHS } from '#app/site';

/** The pricing page's trial sentence, or nothing in a build that names no free scans. */
export function PricingTrial({ trialScans }: { trialScans: number | null }) {
  if (trialScans === null) return null;

  return (
    <p className="max-w-[68ch] font-prose">
      <Trans
        i18nKey="pages.pricing.trial"
        values={{ count: trialScans }}
        components={{ signUp: <ExternalLink href={APP_SIGN_UP_URL} /> }}
      />
    </p>
  );
}

/** The front page's "Getting access" paragraph, with the free scans when the build names them. */
export function AccessBody({ trialScans }: { trialScans: number | null }) {
  const components = {
    signUp: <ExternalLink href={APP_SIGN_UP_URL} />,
    selfHosting: <SiteLink to={DOC_PATHS.appSelfHosting} />,
  };

  if (trialScans === null) {
    return (
      <p>
        <Trans i18nKey="pages.home.access.body" components={components} />
      </p>
    );
  }

  return (
    <p>
      <Trans i18nKey="pages.home.access.bodyTrial" values={{ count: trialScans }} components={components} />
    </p>
  );
}
