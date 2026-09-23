/**
 * The "no app store" block: the install mark in its tile, and the words beside it.
 *
 * The front page and `/app` both carry it, under the `pages.pwa.heading` their own `Section` prints.
 * The strings arrive as props, not as keys read in here, because `tests/unit/landing-claims.test.ts`
 * reads `home.tsx` for every key the front page prints, and a key hidden in this file would print on
 * the front page without that test ever asking whether it is translated.
 *
 * `push` is the reminder line, which `/app` shows and the front page leaves out. It sits under the
 * body in the muted colour, as a footnote to the claim and not a second claim.
 *
 * In `MEASURE`, because a `div` is not one of the elements `Section` centres on its own, and the
 * block belongs in the reading column with the heading above it. One card, square, bordered on all
 * four sides like every card on the site.
 */
import { MonitorSmartphoneIcon } from './icons';
import { IconTile, MEASURE } from './page';

export function InstallNote({ body, push }: { body: string; push?: string }) {
  return (
    <div className={`${MEASURE} flex gap-4 border border-border bg-card p-5 shadow-sm`}>
      <IconTile icon={MonitorSmartphoneIcon} />
      <div className="min-w-0">
        <p className="font-prose leading-relaxed">{body}</p>
        {push !== undefined && (
          <p className="mt-3 font-prose text-sm leading-relaxed text-muted-foreground">{push}</p>
        )}
      </div>
    </div>
  );
}
