/**
 * The front page's grid of screens: one picture, one drawing, one title, one sentence.
 *
 * ── ONE ENTRY PER SCREEN THE CAPTURES COVER, WITH ONE DELIBERATE ABSENCE ──
 * Sync is not here and has no card. `/settings/sync` has redirected to `/settings/account` since
 * M192, so the capture of it is a signed-out card that says you are signed out: honest, and about
 * nothing. Sync is told on this page by the topology diagram out of the architecture document,
 * which draws the ciphertext leaving the device and the photo not going near the server. That is
 * the better picture of it, and it is the one the documentation already maintains.
 *
 * ── EVERY SENTENCE HERE IS THE SITE TALKING, AND THAT IS WHY IT IS IN THE BUNDLE ──
 * The rest of this page quotes the repositories. These four cannot: no document in openplate
 * describes the add screen or the goals screen, because a document is written for somebody
 * operating the software and these are written for somebody deciding whether to. So they live in
 * `common.json` with the other frame copy, where a translator can see them and
 * `tests/unit/landing-claims.test.ts` can insist they came from there.
 *
 * The pictures are NOT decoration and the alt text is not the title said again: it says what is on
 * the screen, for a reader who is given no screen.
 *
 * ── THE DRAWING SITS BESIDE THE HEADING, NOT ON TOP OF THE CARD ──
 * `FEATURE_ILLUSTRATIONS` is drawn on a 64 unit grid and improves all the way to 128 pixels, so the
 * obvious placement is a picture at the head of the card. That placement is wrong HERE, and the
 * reason is the card already has one: a screenshot of the screen the drawing is an abstraction of.
 * Stacked, the card opens by showing the same screen twice, the drawn version first, and at four
 * columns the card is about 250 pixels wide, so the two together push the sentence off the fold.
 * The drawing goes beside the heading instead, at 56 pixels, which is the floor `feature-icons.tsx`
 * names for itself and is still nearly three times the 20 pixel lucide icon it replaces. It labels
 * the card; the screenshot is the card's picture.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { FEATURE_ILLUSTRATIONS, type FeatureScreen } from './illustrations/feature-icons';
import { RowShot } from './shot';

export interface Feature {
  /**
   * The capture, which is also this entry's identity in the list AND the key its drawing is
   * looked up by. Narrowed from `ShotView` to the four screens that have a drawing, so a card for
   * a fifth capture is a compile error here rather than a card with no mark on it.
   */
  view: FeatureScreen;
  titleKey: string;
  bodyKey: string;
  /** What the screenshot SHOWS, in a sentence, for a reader who does not get it. */
  altKey: string;
}

export function FeatureGrid({ features }: { features: readonly Feature[] }) {
  const { t } = useTranslation();

  return (
    // FOUR ACROSS FROM `lg`, WHICH IS NEW AND IS THE POINT OF THE WIDER PAGE. At two columns in a
    // 72rem page each card was 560 pixels holding a 208 pixel picture and one sentence, so the grid
    // read as four half-empty rows. Four columns puts the whole set on one row at the width the
    // front page now has, and the breakpoints below it are untouched: one column on a phone, two
    // from `sm`.
    <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {features.map((feature) => {
        const Illustration = FEATURE_ILLUSTRATIONS[feature.view];
        return (
          <li key={feature.view} className="flex flex-col">
            {/* The picture caps at 13rem and centres on a phone, where the column is the page. Left
                aligned from `sm`, where the column is half of it and a centred picture would float
                away from the title under it. */}
            <RowShotColumn>
              <RowShot view={feature.view} alt={t(feature.altKey)} />
            </RowShotColumn>
            <h3 className="mt-5 flex items-center gap-3 font-display text-lg font-semibold tracking-tight">
              {/* Sized in both axes rather than one. The drawing is 64 units square and carries no
                  `width`, so a class that set only one side would leave the other to the browser's
                  300 by 150 default and the row would jump. */}
              <Illustration className="h-14 w-14 shrink-0" />
              {t(feature.titleKey)}
            </h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(feature.bodyKey)}</p>
          </li>
        );
      })}
    </ul>
  );
}

/** The width rule for a shot in this grid, written once because two call sites would drift. */
function RowShotColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[13rem] sm:mx-0">{children}</div>;
}
