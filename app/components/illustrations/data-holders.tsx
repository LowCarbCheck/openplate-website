/**
 * Who holds what, drawn, so the shape of the answer arrives before the table is read.
 *
 * ── THE ANSWER IS A SHAPE, AND THAT IS WHY IT IS WORTH DRAWING ──
 * The table under this on the page is six rows of careful prose, and a reader gets to the point of
 * it at the end of the sixth. The point is one shape: one row is full and legible, three are empty,
 * and the two others that hold anything hold it either sealed with its key beside it or under
 * somebody else's policy. Almost everything sits on the device. This draws that in one look and
 * then gets out of the way.
 *
 * ── THE COLUMN THIS DRAWS IS "WHAT IT STORES", NOT "WHAT IT SEES" ──
 * The table has both columns and they do not agree: openplate-core stores ciphertext and the
 * escrowed code that unwraps it, and on a managed instance it also FORWARDS a photo it does not
 * keep. The app server forwards the names of the foods you look up and keeps none. The inference
 * runtime stores nothing per user and still sees the photo for the length of one request. A single
 * bar cannot carry both without lying about one of them, so this one carries storage, which is what
 * the heading "who holds what" asks. The transit column stays in the table, where it has words.
 *
 * Place this above that table and not instead of it.
 *
 * ── THE FOUR STATES, WHICH ARE THE WHOLE VOCABULARY ──
 *   - **legible**: an outlined block with lines written on it. Data held as itself.
 *   - **sealed**: a hatched block behind a padlock. Held as ciphertext, unreadable without a key.
 *   - **unknown**: a dashed block trailing into three dots. Held under terms that are not ours.
 *   - **empty**: nothing inside the track at all. Not "a little", none.
 *
 * `DataHoldersKey` below draws the four as a key, with their names in the reader's language.
 *
 * Every row gets the SAME track, the same length, at the same place. That is the only reason the
 * six rows can be compared at a glance, and it is why an empty row is drawn as an empty track
 * rather than as a shorter one.
 *
 * ── THE GRID, BUILT FOR A PHONE FIRST ──
 * 360 by 356 user units. Each row is a name ABOVE a 28 unit track the full width of the drawing, 60
 * units apart: names at baselines 18, 78, 138, 198, 258 and 318, in the table's order. The names
 * are above the tracks rather than beside them because "Fournisseur d'IA dans le cloud" is thirty
 * characters, and a name column beside a track would leave the track no room on a phone.
 *
 * A name is 14 units, 13.6 pixels on a 390 pixel phone, and 9.5 units from `lg`, where the drawing
 * is about 600 pixels wide, which is 15 to 16 pixels. `data-flow.tsx` explains the step.
 *
 * ── MOTION ──
 * The rows fill as the drawing scrolls into view, top to bottom: each row's holdings slide in from
 * the left of their track. It is driven by the scroll position (`animation-timeline`), because a
 * one shot on the first paint finished long before anybody scrolled this far down the page.
 * Nothing loops, because nothing here is traffic: a table of who holds what is a statement.
 *
 * Where the browser has no scroll timelines, or the reader asked for less motion, none of the
 * rules below match and the drawing is simply complete. Only opacity and transform move.
 */
import type { ReactNode } from 'react';

import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';

/**
 * The drawing's aspect ratio, for the wrapper that reserves its box before the first paint. It is
 * the `viewBox` below as a Tailwind class; change one and change the other.
 */
export const DATA_HOLDERS_BOX = 'aspect-[360/356]';

/**
 * The six names, in the reader's language, as required props.
 *
 * One object and not six positional strings: six parameters of the same type in a row is six
 * chances to swap two of them, and swapping "openplate app server" with "openplate-core" here
 * produces a drawing that is wrong in exactly the way this page exists to prevent, while
 * compiling perfectly.
 */
export interface DataHolderLabels {
  /** "Your browser". The device, and the row that is full. */
  browser: string;
  /** "openplate app server". The row that is empty. */
  appServer: string;
  /** "openplate-core". The row that is sealed, with the key that opens it beside it. */
  sync: string;
  /** "openplate-inference". The second row that is empty. */
  inference: string;
  /** "Food database". The third row that is empty. */
  foodDb: string;
  /** "Cloud AI provider". The row that is unknown. */
  cloudProvider: string;
}

export interface DataHoldersProps extends IllustrationProps {
  labels: DataHolderLabels;
}

/** The four states' names, for `DataHoldersKey`. */
export interface DataHolderStateLabels {
  /** "Stored readable". */
  legible: string;
  /** "Stored encrypted". */
  sealed: string;
  /** "Kept under their terms". */
  unknown: string;
  /** "Nothing of yours". */
  empty: string;
}

/*
 * The drawing's `<svg>` names a view timeline, and every row's holdings run on it. `entry` is the
 * stretch of scrolling from the drawing's top edge entering the window to its bottom edge entering
 * it, so it depends on the drawing's own height and not on the window's. A row starts when its
 * top is about to enter and takes 30 percent of that stretch; the last row finishes as the whole
 * drawing is on screen.
 *
 * The shorthand resets the timeline, so the timeline comes after it, as in `app.css`.
 */
const MOTION = `
.op-dh-name { font-size: 14px; }
@media (min-width: 64rem) { .op-dh-name { font-size: 9.5px; } }
@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .op-dh-root { view-timeline-name: --op-dh; }
    .op-dh-fill { animation: op-dh-fill linear both; animation-timeline: --op-dh; }
    .op-dh-row-1 { animation-range: entry 0% entry 30%; }
    .op-dh-row-2 { animation-range: entry 14% entry 44%; }
    .op-dh-row-3 { animation-range: entry 28% entry 58%; }
    .op-dh-row-4 { animation-range: entry 42% entry 72%; }
    .op-dh-row-5 { animation-range: entry 56% entry 86%; }
    .op-dh-row-6 { animation-range: entry 70% entry 100%; }
  }
}
@keyframes op-dh-fill {
  from { opacity: 0; transform: translateX(-24px); }
}
`;

export function DataHolders({ labels, className, label }: DataHoldersProps) {
  return (
    <svg {...SVG_ROOT} {...frameAttributes(label)} viewBox="0 0 360 356" className={`op-dh-root ${className ?? ''}`}>
      <style>{MOTION}</style>

      {/* ── THE DEVICE: FULL, AND LEGIBLE ──
          Three entries, the AI key, and the cached photos, all drawn as themselves. Nothing on this
          row is sealed, and that is not an omission: the store is in the clear because it is your
          device, and a padlock drawn here would be a promise the software does not make. */}
      <Row index={1} name={labels.browser}>
        <g className="text-primary" {...DRAWN} strokeWidth={1.75}>
          <Legible x={8} y={40} width={76} />
          <Legible x={90} y={40} width={76} />
          <Legible x={172} y={40} width={76} />
          <Key x={258} y={40} />
          <Photo x={296} y={40} />
        </g>
      </Row>

      {/* THE APP SERVER: NOTHING OF YOURS. No database, no accounts, no diary. The one key it may
          hold, for the food database, is the operator's and not yours, so the track is empty. */}
      <Row index={2} name={labels.appServer} />

      {/* ── THE SYNC SERVER: ONE LEGIBLE SLIVER, A KEY, AND THE REST SEALED ──
          The sliver is the honest part and it is drawn muted rather than left out: this server does
          hold an address, a verifier and the KDF parameters, and it knows how big your blob is and
          when you wrote it. The key is the other honest part: your recovery code, escrowed and
          sealed under the server's own secret, so a password reset can return the diary. The same
          code is what lets the operator of an instance open the block beside it. Muted like the
          sliver, because it is held for you and is not a copy of what you logged. */}
      <Row index={3} name={labels.sync}>
        <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.75}>
          <Legible x={8} y={160} width={40} />
          <Key x={56} y={160} />
        </g>
        <g className="text-primary" {...DRAWN} strokeWidth={1.75}>
          <Sealed x={94} y={160} width={258} />
        </g>
      </Row>

      {/* THE INFERENCE RUNTIME: NOTHING PER USER. Model weights and a food dataset are the image's,
          not yours, so they are not on a row about what is held OF YOURS. */}
      <Row index={4} name={labels.inference} />

      {/* THE FOOD DATABASE: NOTHING OF YOURS. It gets food names from the app server under the
          instance's key and counts calls per key, which is a number about the key and not about
          you, so the track is empty. */}
      <Row index={5} name={labels.foodDb} />

      {/* ── THE CLOUD PROVIDER: LEGIBLE, THEN UNKNOWN ──
          On the bring-your-own-key path a provider gets the photo and the key, in the clear, and
          what they then keep is their policy and not ours. Drawn as exactly that: two things we can
          name, and then a dashed run into three dots. */}
      <Row index={6} name={labels.cloudProvider}>
        <g className="text-primary" {...DRAWN} strokeWidth={1.75}>
          <Photo x={8} y={340} />
          <Key x={48} y={340} />
        </g>
        <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.75}>
          <Unknown x={86} y={340} width={266} />
        </g>
      </Row>
    </svg>
  );
}

/**
 * The key to the drawing: the four states, each drawn small beside its name.
 *
 * `aria-hidden`, like the drawing it explains: the table under both says the same in words.
 */
export function DataHoldersKey({ labels, className }: { labels: DataHolderStateLabels; className?: string }) {
  return (
    <ul aria-hidden="true" className={className}>
      <KeyItem name={labels.legible}>
        <g className="text-primary" {...DRAWN} strokeWidth={1.75}>
          <Legible x={2} y={12} width={60} />
        </g>
      </KeyItem>
      <KeyItem name={labels.sealed}>
        <g className="text-primary" {...DRAWN} strokeWidth={1.75}>
          <Sealed x={2} y={12} width={60} />
        </g>
      </KeyItem>
      <KeyItem name={labels.unknown}>
        <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.75}>
          <Unknown x={2} y={12} width={60} />
        </g>
      </KeyItem>
      <KeyItem name={labels.empty} />
    </ul>
  );
}

/**
 * One entry in the key: a piece of track 64 by 24 units, 4rem by 1.5rem, and a name.
 *
 * Every entry sits on the same card coloured track the rows do, so the empty entry reads as an
 * empty track and not as a missing picture.
 */
function KeyItem({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <li className="flex items-center gap-4">
      <svg {...SVG_ROOT} viewBox="0 0 64 24" className="h-6 w-16 shrink-0">
        <rect
          x="0.75"
          y="0.75"
          width="62.5"
          height="22.5"
          className="fill-card text-border"
          stroke="currentColor"
          strokeWidth={1.5}
        />
        {children}
      </svg>
      <span>{name}</span>
    </li>
  );
}

/**
 * One row: its name above, its track under it, and whatever is in the track.
 *
 * The track is identical on all six rows and it is drawn HERE rather than by each row, so an empty
 * row cannot quietly become a shorter one. Only the holdings move; the name and the track are there
 * from the first paint.
 */
function Row({ index, name, children }: { index: number; name: string; children?: ReactNode }) {
  const top = (index - 1) * 60;
  return (
    <g>
      <text x="1" y={top + 18} fontWeight={500} className="op-dh-name fill-current text-foreground">
        {name}
      </text>
      <rect
        x="0.75"
        y={top + 26}
        width="358.5"
        height="28"
        className="fill-card text-border"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      {children !== undefined && <g className={`op-dh-fill op-dh-row-${index}`}>{children}</g>}
    </g>
  );
}

/** Data held as itself: a block with lines written on it. */
function Legible({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g>
      <rect x={x} y={y - 8} width={width} height="16" />
      <path d={`M${x + 7} ${y - 3} H${x + width - 7}`} />
      <path d={`M${x + 7} ${y + 3} H${x + width - Math.round(width / 2)}`} />
    </g>
  );
}

/** How far apart the hatching on a sealed block is drawn, in `viewBox` units. */
const HATCH_STEP = 14;

/** Held and unreadable: hatching behind a padlock, and no line anybody could read. */
function Sealed({ x, y, width }: { x: number; y: number; width: number }) {
  const first = x + 26;
  const count = Math.max(0, Math.ceil((x + width - 8 - first) / HATCH_STEP));
  return (
    <g>
      <rect x={x} y={y - 8} width={width} height="16" />
      {Array.from({ length: count }, (_unused, index) => {
        const at = first + index * HATCH_STEP;
        return <path key={at} d={`M${at} ${y + 5} L${at + 8} ${y - 5}`} strokeWidth={1.25} opacity="0.6" />;
      })}
      <g transform={`translate(${x + 6} ${y - 7})`}>
        <rect x="0.5" y="5.5" width="11" height="8" />
        <path d="M3.5 5.5 V4.2 a2.6 2.6 0 0 1 5.2 0 V5.5" />
      </g>
    </g>
  );
}

/** Held under terms that are not ours: a dashed block that trails off rather than ending. */
function Unknown({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g>
      <rect x={x} y={y - 8} width={width - 30} height="16" strokeDasharray="5 5" />
      <circle cx={x + width - 20} cy={y} r="2" fill="currentColor" stroke="none" />
      <circle cx={x + width - 11} cy={y} r="2" fill="currentColor" stroke="none" />
      <circle cx={x + width - 2} cy={y} r="2" fill="currentColor" stroke="none" />
    </g>
  );
}

/**
 * A key, 28 units wide. In the primary colour it is the AI key: on the device on the BYOK path,
 * and at the provider. Muted on the sync row it is your recovery code, escrowed by the server.
 */
function Key({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="6" cy="0" r="5" />
      <path d="M11 0 H27" />
      <path d="M22 0 V5" />
      <path d="M26 0 V4.5" />
    </g>
  );
}

/** A cached plate photo, 30 units wide. */
function Photo({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y - 9})`}>
      <rect x="0.5" y="0.5" width="29" height="17" />
      <circle cx="8" cy="6" r="2" />
      <path d="M2 16 L10 8.5 L14.5 13 L18.5 10 L29 16.5" />
    </g>
  );
}
