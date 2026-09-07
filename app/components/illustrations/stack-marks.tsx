/**
 * A drawn header for each of the three stack cards: the app, the sync server, the inference runtime.
 *
 * ── ONE SET, WHICH IS THE WHOLE REQUIREMENT ──
 * `STACK_ICONS` in `app/components/icons.tsx` is lucide's `smartphone`, `refresh-cw` and `cpu`, and
 * those are a set because lucide drew them as one. These are bigger and they say more, so being a
 * set has to be arranged. Five things are held constant and nothing else is:
 *
 *   1. The same frame: 120 by 64 user units, landscape, so three cards in a row line up.
 *   2. The same line: a 2.5 unit round stroke on the thing itself, 1.8 on its parts.
 *   3. The same colour grammar: the thing in `text-foreground`, its parts and its guides in
 *      `text-muted-foreground`, and the primary colour reserved for what MOVES.
 *   4. The same subject: a device with a diary on it. It is in all three, because the client is
 *      the product and the other two are attachments to it.
 *   5. The same amount of ink. This is the one that had to be fixed rather than designed: the
 *      first draft drew a small phone alone in the app's frame beside two marks that used the
 *      whole width, and next to each other the app card read as the unfinished one. The lone phone
 *      is now drawn nearly frame height, so the three carry comparable weight in a row.
 *
 * ── WHAT THESE MUST NOT SAY ──
 * The app mark has NO arrow, and that absence is its content: everything a user owns is written to
 * the store on the device it was entered on, so a header for that card with anything leaving it
 * would draw the opposite of the card. The sync mark carries a padlock the whole way across and
 * the server sits UNDER the path rather than opening it. The inference mark is a round trip between
 * the device and the endpoint with no third box on it, because on the direct path there is none.
 *
 * ── NO TEXT, SO NO TEXT PROPS ──
 * Same as `feature-icons.tsx`: these sit on a card whose heading and paragraph come out of the
 * repositories in the reader's language, so there is nothing here to translate and nothing here to
 * hardcode in English. `label` stays available and stays off by default.
 */
import type { JSX } from 'react';

import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';
import type { DocComponent } from '#app/lib/docs';

/** One frame for all three. See the header: this is one of the five things that makes them a set. */
const BOX = { viewBox: '0 0 120 64' } as const;

/** The thing itself. */
const LINE = { ...DRAWN, strokeWidth: 2.5 } as const;

/** The parts inside a thing, one step finer than its outline. */
const DETAIL = { ...DRAWN, strokeWidth: 1.8 } as const;

const APP_MOTION = `
.op-sm-write { transform-box: fill-box; transform-origin: left center; }
.op-sm-write-run { animation: op-sm-write-run 4s ease-in-out infinite; }
@keyframes op-sm-write-run {
  0% { transform: scaleX(0.04); opacity: 1; }
  38% { transform: scaleX(1); opacity: 1; }
  82% { transform: scaleX(1); opacity: 1; }
  100% { transform: scaleX(1); opacity: 0; }
}
`;

/** The app: a device with a diary on it, and a fourth entry writing itself in and staying there. */
export function AppMark({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{APP_MOTION}</style>
      <g className="text-foreground" {...LINE}>
        <rect x="38" y="2" width="44" height="60" rx="9" />
      </g>
      <g className="text-muted-foreground" {...DETAIL}>
        <path d="M52 9 H68" />
        <rect x="44" y="14" width="32" height="43" rx="4" />
        <DiaryRow y={23} />
        <DiaryRow y={32} />
        <DiaryRow y={41} />
        <rect x="48" y="48" width="5" height="5" rx="1.4" />
      </g>
      <g className="text-primary">
        <rect className="op-sm-write op-sm-write-run" x="57" y="49.5" width="14" height="2.4" rx="1.2" fill="currentColor" />
      </g>
    </svg>
  );
}

/** A row of the diary: the entry, and the words on it. */
function DiaryRow({ y }: { y: number }) {
  return (
    <g>
      <rect x="48" y={y - 2.5} width="5" height="5" rx="1.4" />
      <path d={`M57 ${y} H71`} />
    </g>
  );
}

const SYNC_MOTION = `
.op-sm-cross { opacity: 0; }
.op-sm-cross-run { animation: op-sm-cross-run 4.4s ease-in-out infinite; }
@keyframes op-sm-cross-run {
  0% { transform: translateX(0); opacity: 0; }
  14% { opacity: 1; }
  84% { opacity: 1; }
  100% { transform: translateX(52px); opacity: 0; }
}
`;

/**
 * Sync: the same diary arriving on a second device, sealed the whole way across.
 *
 * The server is drawn small, muted, and UNDER the path rather than on it. That is a deliberate
 * picture of a service that carries a blob without opening it, and it is also why the padlock is
 * the only thing on the line: nothing in this mark shows the seal coming off, because nothing in
 * the protocol takes it off.
 */
export function SyncMark({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{SYNC_MOTION}</style>
      <g className="text-foreground" {...LINE}>
        <rect x="4" y="8" width="28" height="44" rx="7" />
        <rect x="88" y="8" width="28" height="44" rx="7" />
      </g>
      <g className="text-muted-foreground" {...DETAIL}>
        <rect x="9" y="15" width="18" height="30" rx="3" />
        <rect x="93" y="15" width="18" height="30" rx="3" />
        <path d="M36 26 H84" strokeDasharray="4 5" />
        {/* The stub, and the server it goes down to: beside the path, carrying it, never opening it. */}
        <path d="M60 26 V34" strokeDasharray="3 3" />
        <rect x="46" y="36" width="28" height="18" rx="4" />
        <path d="M51 41.5 h0.01" strokeWidth={2.6} />
        <path d="M51 48.5 h0.01" strokeWidth={2.6} />
        <path d="M56 41.5 H69" />
        <path d="M56 48.5 H69" />
      </g>
      <g className="op-sm-cross op-sm-cross-run text-primary" {...DETAIL}>
        <g transform="translate(32 19)">
          <rect x="0.5" y="5.5" width="11" height="8" rx="2" />
          <path d="M3.5 5.5 V4.2 a2.6 2.6 0 0 1 5.2 0 V5.5" />
        </g>
      </g>
    </svg>
  );
}

const INFERENCE_MOTION = `
.op-sm-trip { opacity: 0; }
.op-sm-out { animation: op-sm-out 4.6s ease-in-out infinite; }
.op-sm-back { animation: op-sm-back 4.6s ease-in-out infinite; }
@keyframes op-sm-out {
  0% { transform: translateX(0); opacity: 0; }
  8% { opacity: 1; }
  34% { transform: translateX(26px); opacity: 1; }
  42% { transform: translateX(26px); opacity: 0; }
  100% { transform: translateX(26px); opacity: 0; }
}
@keyframes op-sm-back {
  0%, 52% { transform: translateX(0); opacity: 0; }
  60% { opacity: 1; }
  86% { transform: translateX(-26px); opacity: 1; }
  100% { transform: translateX(-26px); opacity: 0; }
}
`;

/**
 * Inference: the photo goes out to the endpoint and the numbers come back, and nothing is between.
 *
 * A round trip and not a one way arrow, because that is the shape of the request: the browser posts
 * the photo and reads the answer. Two boxes and two arrows is also the exact count of things on
 * that path, which is the claim the card under this mark makes.
 */
export function InferenceMark({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...BOX} {...frameAttributes(label)} className={className}>
      <style>{INFERENCE_MOTION}</style>
      <g className="text-foreground" {...LINE}>
        <rect x="4" y="8" width="28" height="44" rx="7" />
        <rect x="74" y="14" width="34" height="34" rx="7" />
      </g>
      <g className="text-muted-foreground" {...DETAIL}>
        {/* The photo, on the device that took it. */}
        <rect x="9" y="20" width="18" height="16" rx="3" />
        <circle cx="14" cy="25" r="1.6" />
        <path d="M10 34 L15.5 28.5 L19 32 L21.5 29.5 L26 34" />
        {/* The machine. */}
        <rect x="83" y="23" width="16" height="16" rx="3" />
        <path d="M81 14 V9 M91 14 V9 M101 14 V9" />
        <path d="M81 48 V53 M91 48 V53 M101 48 V53" />
        <path d="M108 22 H113 M108 31 H113 M108 40 H113" />
        <path d="M36 24 H66" />
        <path d="M63 21 L67 24 L63 27" />
        <path d="M70 42 H40" />
        <path d="M43 39 L39 42 L43 45" />
      </g>
      <g className="op-sm-trip op-sm-out text-primary">
        <rect x="38" y="20.5" width="7" height="7" rx="2" fill="currentColor" />
      </g>
      {/* What comes back is numbers, so it is drawn as two rows rather than as a second parcel. */}
      <g className="op-sm-trip op-sm-back text-primary" {...DETAIL}>
        <path d="M62 40 H70" />
        <path d="M62 44 H67" />
      </g>
    </svg>
  );
}

/**
 * The three, by the key the documentation already addresses them with.
 *
 * The same shape as `STACK_ICONS`, and for the same reason: a fourth component becomes a compiler
 * error here rather than a card with no header.
 */
export const STACK_MARKS = {
  app: AppMark,
  sync: SyncMark,
  inference: InferenceMark,
} satisfies Record<DocComponent, (props: IllustrationProps) => JSX.Element>;
