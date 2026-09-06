/**
 * The product screenshots, drawn.
 *
 * ── ONE IMAGE IDIOM ON THIS SITE, AND IT IS THE ONE THE DOCUMENTATION ALREADY USES ──
 * `doc-blocks.tsx` draws a diagram as a `<picture>` with the dark copy behind a
 * `prefers-color-scheme` `<source>` and the light copy as the `<img>`. Everything below is that
 * same shape. It matters more here than it does there: the app's own landing page carries both
 * themes of every screenshot in the document and toggles them with a `dark:hidden` class, because
 * the app's dark mode is a class a person can set. This site's is the media query alone, so the
 * `<source>` can carry it, and a reader downloads ONE of the two files instead of both. Five
 * screenshots on the front page is the difference between about 400 KB and about 800 KB.
 *
 * ── THE LANGUAGE OF THE PICTURE IS THE LANGUAGE OF THE URL ──
 * `useLanguage()` reads it off the location, `shotLocale` resolves it to a language captures exist
 * in, and no component below takes a locale prop. A page cannot show a German paragraph over an
 * English screen by forgetting to pass something.
 *
 * ── EVERY CAPTURE SHOWS EXAMPLE DATA, AND THE PAGE HAS TO SAY SO ──
 * The diary in these pictures is full of food nobody ate. `ExampleDataNote` is the sentence that
 * says it, and it belongs in the same view as the picture rather than in a footnote at the bottom
 * of the page: a reader who scrolls past a screenshot has already believed it.
 * `tests/unit/example-data-notice.test.ts` refuses a page that draws a shot without one.
 */
import { useTranslation } from 'react-i18next';

import { useLanguage } from '#app/i18n/use-language';
import {
  DESKTOP_SHOT,
  DESKTOP_SHOT_WIDTHS,
  PHONE_SHOT_WIDTH,
  SHOT_SPECS,
  type ShotView,
  desktopShotPath,
  phoneShotPath,
  shotLocale,
} from '#app/lib/shots';

/**
 * The bottom-edge fade a CROPPED capture carries, and nothing else does.
 *
 * A 780x1688 capture is one phone viewport of a page that scrolls, so it ends wherever the viewport
 * did: mid-row, through a food name and half a number. A hard edge there reads as a broken image; a
 * fade reads as a list that continues past the frame, which is what it is. 84% keeps the fade clear
 * of everything legible and spends the last sixth of the picture on it. Ported, with the reasoning,
 * from `openplate/app/routes/index.tsx`, where it was arrived at against these same files.
 */
const CROP_FADE = '[mask-image:linear-gradient(to_bottom,black_84%,transparent_100%)]';

/**
 * The one frame every screenshot on this site sits in.
 *
 * A hairline and the card ground, which is what every other bordered thing here is: the quote
 * block, the diagram, the stack card. The app's landing page frames its shots in a brand-tinted
 * border with a shadow, because that page is a shopfront and it has one hero card to establish. It
 * would be the loudest thing on this site by a distance. The frame is here to stop a screenshot's
 * own white bleeding into a white card, not to sell it.
 */
const SHOT_FRAME = 'overflow-hidden rounded-lg border border-border bg-card p-1';

/**
 * The rendered shape every screenshot in a ROW is cut to, and the reason the row has a baseline.
 *
 * `39/56` is 780x1120 reduced: the ratio of the SHORTEST capture, which is the scan screen. That
 * one fills its box exactly and is never scaled up; the taller ones are cropped at the bottom by
 * `object-cover object-top`, which is the end they were already continuing past. Never the other
 * way round. A box TALLER than a capture makes `object-cover` scale that capture up and take the
 * overflow off its sides, which is a blurrier picture of less of the screen.
 *
 * So this constant follows the manifest: if the scan screen ever grows past 1120, the ratio moves
 * to whichever capture in `SHOT_SPECS` is then the shortest.
 *
 * A ratio and not a fixed height, because the column is about 150px wide on a phone and about 210px
 * on a laptop, and a fixed height would have `object-cover` crop the SIDES off the narrow one.
 * Equal columns plus one ratio is one height, at every viewport rather than at the one that was
 * checked.
 */
const ROW_SHOT_ASPECT = 'aspect-[39/56]';

/**
 * One phone capture, in the reader's language and their appearance, at its own aspect ratio.
 *
 * Lazy, and its intrinsic size is on the element, so nothing below it moves when it arrives.
 */
function PhonePicture({ view, alt, className }: { view: ShotView; alt: string; className?: string }) {
  const locale = shotLocale(useLanguage());
  const spec = SHOT_SPECS[view];

  return (
    <picture>
      <source srcSet={phoneShotPath(locale, view, 'dark')} media="(prefers-color-scheme: dark)" type="image/webp" />
      <img
        src={phoneShotPath(locale, view, 'light')}
        alt={alt}
        width={PHONE_SHOT_WIDTH}
        height={spec.height}
        loading="lazy"
        decoding="async"
        className={className}
      />
    </picture>
  );
}

/**
 * One screenshot in a row of them: framed, cut to the row's ratio, faded if the cut cut anything.
 *
 * The caller sizes the column and this fills it. Every shot in a grid goes through here rather than
 * through `PhonePicture` directly, because three captures at their own ratios in one row is three
 * ragged columns: everything under a picture starts where that picture ends, so the titles and the
 * paragraphs of parallel entries each begin at a different height.
 */
export function RowShot({ view, alt }: { view: ShotView; alt: string }) {
  const cropped = !SHOT_SPECS[view].whole;

  return (
    <div className={SHOT_FRAME}>
      <div className={`relative overflow-hidden rounded-md ${ROW_SHOT_ASPECT} ${cropped ? CROP_FADE : ''}`}>
        <PhonePicture view={view} alt={alt} className="absolute inset-0 h-full w-full object-cover object-top" />
      </div>
    </div>
  );
}

/**
 * One screenshot standing on its own, framed, at the capture's own ratio.
 *
 * For a page that shows ONE picture beside its own prose, where there is no row to keep a baseline
 * with and therefore no reason to cut the capture to somebody else's ratio. The caller caps the
 * width; a phone capture allowed to fill a reading column is a picture two screens tall.
 */
export function PhoneShot({ view, alt, className }: { view: ShotView; alt: string; className?: string }) {
  const cropped = !SHOT_SPECS[view].whole;

  return (
    <div className={`${SHOT_FRAME} ${className ?? ''}`}>
      <PhonePicture view={view} alt={alt} className={`w-full rounded-md ${cropped ? CROP_FADE : ''}`} />
    </div>
  );
}

/**
 * The hero's capture of the diary, which is the one place the DESKTOP screen is shown.
 *
 * ── FOUR FILES, ONE DOWNLOAD ──
 * Two appearances times two form factors is four candidates, and the `<source>` list picks exactly
 * one. Order is the whole mechanism: the browser takes the FIRST source whose media query matches,
 * so the two dark rules have to stand above the two light ones, and within each pair the desktop
 * rule above the phone one. Reordering these four lines silently serves a phone capture to a
 * laptop, and it still renders.
 *
 * `sizes` is the container's real cap rather than `100vw`, or every laptop takes the 2160 file to
 * draw it at 700px.
 *
 * `40rem` is Tailwind's `sm` written out, because a media query cannot read a Tailwind token. It
 * MUST stay in step with the `sm:` classes on the `<img>`, which is where the second half of this
 * lives: `width` and `height` on that element describe the PHONE capture, and from `sm` up the
 * sources above serve a 3:2 desktop one. A browser that maps a `<source>`'s own dimensions onto the
 * box reserves the right space by itself, and Safari before 16.4 does not: it laid out a 3:2 image
 * in a 0.46:1 box and the whole page jumped when the hero decoded. The ratio is stated in CSS at
 * exactly the breakpoint where the source swaps.
 *
 * NOT lazy, and it carries `fetchPriority="high"`: whichever of these paints IS the largest
 * contentful paint of the front page.
 */
export function HeroShot({ alt }: { alt: string }) {
  const locale = shotLocale(useLanguage());
  const desktop = (theme: 'light' | 'dark') =>
    DESKTOP_SHOT_WIDTHS.map((width) => `${desktopShotPath(locale, theme, width)} ${width}w`).join(', ');

  return (
    <div className={`${SHOT_FRAME} rounded-xl p-1.5 sm:p-2`}>
      <picture>
        <source
          media="(prefers-color-scheme: dark) and (min-width: 40rem)"
          srcSet={desktop('dark')}
          sizes="(min-width: 64rem) 44rem, 100vw"
          width={DESKTOP_SHOT.width}
          height={DESKTOP_SHOT.height}
          type="image/webp"
        />
        <source
          media="(prefers-color-scheme: dark)"
          srcSet={phoneShotPath(locale, 'diary', 'dark')}
          type="image/webp"
        />
        <source
          media="(min-width: 40rem)"
          srcSet={desktop('light')}
          sizes="(min-width: 64rem) 44rem, 100vw"
          width={DESKTOP_SHOT.width}
          height={DESKTOP_SHOT.height}
          type="image/webp"
        />
        <img
          src={phoneShotPath(locale, 'diary', 'light')}
          alt={alt}
          width={PHONE_SHOT_WIDTH}
          height={SHOT_SPECS.diary.height}
          decoding="async"
          fetchPriority="high"
          className={`mx-auto w-full max-w-[17rem] rounded-lg ${CROP_FADE} sm:aspect-[3/2] sm:max-w-none sm:[mask-image:none]`}
        />
      </picture>
    </div>
  );
}

/**
 * The sentence that says the food in these pictures is nobody's.
 *
 * It is a component and not a `t()` call at each site so that the test can find it, and so that the
 * wording is one string in one place: a page that says "example data" under the hero and "sample
 * numbers" under the grid has told the reader twice and told them two different things.
 */
export function ExampleDataNote({ className }: { className?: string }) {
  const { t } = useTranslation();

  return <p className={`text-sm text-muted-foreground ${className ?? ''}`}>{t('site.exampleData')}</p>;
}
