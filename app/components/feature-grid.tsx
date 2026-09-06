/**
 * The front page's grid of screens: one picture, one icon, one title, one sentence.
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
 */
import type { ComponentType, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import type { IconProps } from './icons';
import { RowShot } from './shot';
import type { ShotView } from '#app/lib/shots';

export interface Feature {
  /** The capture, which is also this entry's identity in the list. */
  view: ShotView;
  icon: ComponentType<IconProps>;
  titleKey: string;
  bodyKey: string;
  /** What the screenshot SHOWS, in a sentence, for a reader who does not get it. */
  altKey: string;
}

export function FeatureGrid({ features }: { features: readonly Feature[] }) {
  const { t } = useTranslation();

  return (
    <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
      {features.map((feature) => (
        <li key={feature.view} className="flex flex-col">
          {/* The picture caps at 13rem and centres on a phone, where the column is the page. Left
              aligned from `sm`, where the column is half of it and a centred picture would float
              away from the title under it. */}
          <RowShotColumn>
            <RowShot view={feature.view} alt={t(feature.altKey)} />
          </RowShotColumn>
          <h3 className="mt-5 flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
            <feature.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            {t(feature.titleKey)}
          </h3>
          <p className="mt-2 leading-relaxed text-muted-foreground">{t(feature.bodyKey)}</p>
        </li>
      ))}
    </ul>
  );
}

/** The width rule for a shot in this grid, written once because two call sites would drift. */
function RowShotColumn({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[13rem] sm:mx-0">{children}</div>;
}
