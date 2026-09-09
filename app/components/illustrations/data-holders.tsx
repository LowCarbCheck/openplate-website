/**
 * Who holds what, drawn, so the shape of the answer arrives before the table is read.
 *
 * ── THE ANSWER IS A SHAPE, AND THAT IS WHY IT IS WORTH DRAWING ──
 * The table under this on the page is five rows of careful prose, and a reader gets to the point of
 * it at the end of the fifth. The point is one shape: one row is full and legible, two are empty,
 * and the two that hold anything hold it either sealed or under somebody else's policy. Almost
 * everything sits on the device. This draws that in one look and then gets out of the way.
 *
 * ── THE COLUMN THIS DRAWS IS "WHAT IT STORES", NOT "WHAT IT SEES" ──
 * The table has both columns and they do not agree: openplate-core stores ciphertext it holds no
 * key for, and on a managed instance it also FORWARDS a photo it does not keep. The inference
 * runtime stores nothing per user and still sees the photo for the length of one request. A single
 * bar cannot carry both without lying about one of them, so this one carries storage, which is what
 * the heading "who holds what" asks. The transit column stays in the table, where it has words.
 *
 * Place this above that table and not instead of it.
 *
 * ── THE FOUR STATES, WHICH ARE THE WHOLE VOCABULARY ──
 *   - **legible**: an outlined block with lines written on it. Data held as itself.
 *   - **sealed**: a hatched block behind a padlock. Held, and unreadable to the holder.
 *   - **unknown**: a dashed block trailing into three dots. Held under terms that are not ours.
 *   - **empty**: nothing inside the track at all. Not "a little", none.
 *
 * Every row gets the SAME track, the same length, at the same place. That is the only reason the
 * five rows can be compared at a glance, and it is why an empty row is drawn as an empty track
 * rather than as a shorter one.
 *
 * ── THE GRID ──
 * 520 by 216 user units. A label column ending at x 176, and a 312 unit track from 192 to 504 on
 * every row. Rows are 40 apart, centred at y 28, 68, 108, 148 and 188.
 *
 * ── HOW WIDE IT NEEDS TO BE ──
 * The names are 12 units on a 520 unit grid, so about a forty-fourth of the rendered width. The
 * same floor as `data-flow.tsx`: below roughly 480 pixels the five names stop being readable, and
 * the answer is `FullWidth` or a scrolling wrapper rather than a smaller drawing.
 *
 * ── MOTION ──
 * The five rows arrive in order, once, on the first paint, and then it is a static drawing. The
 * stagger is written into five keyframe sets rather than into `animation-delay`, for the reason
 * `frame.tsx` gives: a delayed animation with no fill mode shows the finished row first and then
 * snaps it away to start. Nothing here loops, because nothing here is traffic: a table of who holds
 * what is a statement, and a statement that keeps re-animating is a statement nobody finishes
 * reading.
 */
import type { ReactNode } from 'react';

import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';

/**
 * The five names, in the reader's language, as required props.
 *
 * One object and not five positional strings: five parameters of the same type in a row is five
 * chances to swap two of them, and swapping "openplate app server" with "openplate-core" here
 * produces a drawing that is wrong in exactly the way this page exists to prevent, while
 * compiling perfectly.
 */
export interface DataHolderLabels {
  /** "Your browser". The device, and the row that is full. */
  browser: string;
  /** "openplate app server". The row that is empty. */
  appServer: string;
  /** "openplate-core". The row that is sealed. */
  sync: string;
  /** "openplate-inference". The other row that is empty. */
  inference: string;
  /** "Cloud AI provider". The row that is unknown. */
  cloudProvider: string;
}

export interface DataHoldersProps extends IllustrationProps {
  labels: DataHolderLabels;
}

const MOTION = `
.op-dh-row-1 { animation: op-dh-row-1 1500ms ease-out; }
.op-dh-row-2 { animation: op-dh-row-2 1500ms ease-out; }
.op-dh-row-3 { animation: op-dh-row-3 1500ms ease-out; }
.op-dh-row-4 { animation: op-dh-row-4 1500ms ease-out; }
.op-dh-row-5 { animation: op-dh-row-5 1500ms ease-out; }
@keyframes op-dh-row-1 {
  0% { opacity: 0; transform: translateY(5px); }
  36%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes op-dh-row-2 {
  0%, 13% { opacity: 0; transform: translateY(5px); }
  49%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes op-dh-row-3 {
  0%, 26% { opacity: 0; transform: translateY(5px); }
  62%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes op-dh-row-4 {
  0%, 39% { opacity: 0; transform: translateY(5px); }
  75%, 100% { opacity: 1; transform: translateY(0); }
}
@keyframes op-dh-row-5 {
  0%, 52% { opacity: 0; transform: translateY(5px); }
  88%, 100% { opacity: 1; transform: translateY(0); }
}
`;

export function DataHolders({ labels, className, label }: DataHoldersProps) {
  return (
    <svg {...SVG_ROOT} {...frameAttributes(label)} viewBox="0 0 520 216" className={className}>
      <style>{MOTION}</style>

      {/* ── THE DEVICE: FULL, AND LEGIBLE ──
          Three entries, the AI key, and the cached photos, all drawn as themselves. Nothing on this
          row is sealed, and that is not an omission: the store is in the clear because it is your
          device, and a padlock drawn here would be a promise the software does not make. */}
      <Row className="op-dh-row-1" y={28} name={labels.browser}>
        <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
          <Legible x={200} y={28} width={70} />
          <Legible x={278} y={28} width={70} />
          <Legible x={356} y={28} width={70} />
          <Key x={434} y={28} />
          <Photo x={464} y={28} />
        </g>
      </Row>

      {/* THE APP SERVER: NOTHING. No database, no accounts, no secrets, so an empty track. */}
      <Row className="op-dh-row-2" y={68} name={labels.appServer} />

      {/* ── THE SYNC SERVER: ONE LEGIBLE SLIVER, AND THE REST SEALED ──
          The sliver is the honest part and it is drawn muted rather than left out: this server does
          hold an address, a verifier and the KDF parameters, and it knows how big your blob is and
          when you wrote it. What it cannot do is open the block beside it. */}
      <Row className="op-dh-row-3" y={108} name={labels.sync}>
        <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.6}>
          <Legible x={200} y={108} width={44} />
        </g>
        <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
          <Sealed x={254} y={108} width={216} />
        </g>
      </Row>

      {/* THE INFERENCE RUNTIME: NOTHING PER USER. Model weights and a food dataset are the image's,
          not yours, so they are not on a row about what is held OF YOURS. */}
      <Row className="op-dh-row-4" y={148} name={labels.inference} />

      {/* ── THE CLOUD PROVIDER: LEGIBLE, THEN UNKNOWN ──
          On the bring-your-own-key path a provider gets the photo and the key, in the clear, and
          what they then keep is their policy and not ours. Drawn as exactly that: two things we can
          name, and then a dashed run into three dots. */}
      <Row className="op-dh-row-5" y={188} name={labels.cloudProvider}>
        <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
          <Photo x={200} y={188} />
          <Key x={232} y={188} />
        </g>
        <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.6}>
          <Unknown x={266} y={188} width={204} />
        </g>
      </Row>
    </svg>
  );
}

/**
 * One row: its name on the left, its track on the right, and whatever is in the track.
 *
 * The track is identical on all five rows and it is drawn HERE rather than by each row, so an empty
 * row cannot quietly become a shorter one.
 */
function Row({
  className,
  y,
  name,
  children,
}: {
  className: string;
  y: number;
  name: string;
  children?: ReactNode;
}) {
  return (
    <g className={className}>
      <text x="176" y={y + 4} textAnchor="end" fontSize="12" className="fill-current text-foreground">
        {name}
      </text>
      <g className="text-border" {...DRAWN} strokeWidth={1.5}>
        <rect x="192" y={y - 11} width="312" height="22" rx="7" />
      </g>
      {children}
    </g>
  );
}

/** Data held as itself: a block with lines written on it. */
function Legible({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g>
      <rect x={x} y={y - 7} width={width} height="14" rx="4" />
      <path d={`M${x + 6} ${y - 2.5} H${x + width - 6}`} />
      <path d={`M${x + 6} ${y + 2.5} H${x + width - Math.round(width / 2)}`} />
    </g>
  );
}

/** How far apart the hatching on a sealed block is drawn, in `viewBox` units. */
const HATCH_STEP = 14;

/** Held and unreadable: hatching behind a padlock, and no line anybody could read. */
function Sealed({ x, y, width }: { x: number; y: number; width: number }) {
  const first = x + 26;
  const count = Math.max(0, Math.ceil((x + width - 6 - first) / HATCH_STEP));
  return (
    <g>
      <rect x={x} y={y - 7} width={width} height="14" rx="4" />
      {Array.from({ length: count }, (_unused, index) => {
        const at = first + index * HATCH_STEP;
        return <path key={at} d={`M${at} ${y + 5} L${at + 8} ${y - 5}`} strokeWidth={1.2} opacity="0.6" />;
      })}
      <g transform={`translate(${x + 6} ${y - 7})`}>
        <rect x="0.5" y="5.5" width="11" height="8" rx="2" />
        <path d="M3.5 5.5 V4.2 a2.6 2.6 0 0 1 5.2 0 V5.5" />
      </g>
    </g>
  );
}

/** Held under terms that are not ours: a dashed block that trails off rather than ending. */
function Unknown({ x, y, width }: { x: number; y: number; width: number }) {
  return (
    <g>
      <rect x={x} y={y - 7} width={width - 30} height="14" rx="4" strokeDasharray="5 5" />
      <circle cx={x + width - 20} cy={y} r="1.8" fill="currentColor" stroke="none" />
      <circle cx={x + width - 11} cy={y} r="1.8" fill="currentColor" stroke="none" />
      <circle cx={x + width - 2} cy={y} r="1.8" fill="currentColor" stroke="none" />
    </g>
  );
}

/** The AI key: on the device on the BYOK path, and at the provider, and nowhere else. */
function Key({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y - 7})`}>
      <circle cx="5" cy="7" r="4" />
      <path d="M9 7 H21" />
      <path d="M17 7 V11" />
      <path d="M20 7 V10.5" />
    </g>
  );
}

/** A cached plate photo. */
function Photo({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y - 7})`}>
      <rect x="0.5" y="0.5" width="23" height="13" rx="3" />
      <circle cx="6" cy="5" r="1.6" />
      <path d="M2 12 L8.5 6.5 L12 10 L15 7.5 L22.5 13" />
    </g>
  );
}
