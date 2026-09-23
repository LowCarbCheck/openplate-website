/**
 * The word "openplate" in the header, set the way the application sets it.
 *
 * THE RECIPE is the application's (`openplate/app/components/wordmark.tsx`): Victor Mono at its
 * lowest weight, tracking pulled in to -0.03em, "open" in the brand teal and "plate" in the ink
 * around it. Every part of it lives here so no caller passes a weight, a tracking or a colour for
 * the word. Size stays with the caller through `className`.
 *
 * THE NAME STILL COMES FROM THE BUNDLE. `site.name` is "openplate" in every language, and the
 * split below only happens when the translated name starts with "open". A bundle that ever spells
 * it differently gets the whole word in ink rather than a teal cut in the wrong place.
 *
 * `font-display` resolves to the brand role in `app.css`, and this is the only file that uses it.
 */
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

/** Where the word breaks in two. "open" is teal, "plate" takes the ink of the place it sits in. */
const TEAL_HALF = 'open';

export function Wordmark({ className }: { className?: string }): ReactElement {
  const { t } = useTranslation();
  const name = t('site.name');
  const classes = `font-display font-thin tracking-[-0.03em] ${className ?? ''}`;

  if (!name.startsWith(TEAL_HALF)) return <span className={classes}>{name}</span>;

  return (
    <span className={classes}>
      <span className="text-primary">{TEAL_HALF}</span>
      {name.slice(TEAL_HALF.length)}
    </span>
  );
}
