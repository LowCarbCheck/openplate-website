/**
 * Where your data goes, told in four steps: the five boxes, the five arrows, and a legend that
 * runs through them in order.
 *
 * ── WHAT THIS DRAWING ASSERTS, AND WHY EVERY LINE OF IT IS CHECKABLE ──
 * It is `docs/architecture.md`'s own flowchart, drawn rather than generated, and it says exactly
 * what that document says and nothing more:
 *
 *   1. The names of the foods you look up leave for the app server, which passes them on to the
 *      food database. The route runs INTO the app server's box and out of it again, and the box
 *      stays empty behind a dashed edge, because it keeps none of them.
 *   2. The photo leaves for whichever AI endpoint you configured, directly.
 *   3. The diary leaves for openplate-core sealed. The glyph on that arrow is a padlock, because
 *      what travels is ciphertext. What the server also keeps is `data-holders.tsx`'s to draw.
 *   4. Everything else stays on the device, which holds the diary and the photo in the clear.
 *
 * The app server also sends the page, and it stands on neither the diary path nor the photo path.
 * That is drawn three ways at once, because it is the claim a reader is most entitled to
 * disbelieve: it is on the far side of the device from both, the page arrow is muted and never
 * lights up, and the only lines that touch its box are the page and the names.
 *
 * ── THE GRID, WHICH IS BUILT FOR A PHONE FIRST ──
 * 360 by 374 user units. Two columns centred on x 90 and x 270. The top row is the app server
 * and the food database, the middle is the device as a browser window across the whole width,
 * and the bottom row is the AI endpoint and openplate-core. Every route is orthogonal, so an
 * arrowhead needs no rotation.
 *
 * The earlier drawing was 520 wide with the boxes side by side, which put its words at about a
 * forty-fourth of the rendered width: eight pixels on a phone, and small beside a 42rem column.
 * Here a label is 14 units on a 360 unit grid, 13.6 pixels on a 390 pixel phone, where the drawing
 * is about 350 wide. From `lg` the drawing is about 600 pixels wide and the same 14 units would be
 * 23 pixels, so the stylesheet below steps the label size down to 9.5 units there, which renders at
 * about 15 to 16 pixels. The geometry does not change; only the type does, and it only shrinks,
 * so nothing that fits on a phone can collide on a desktop.
 *
 * Each node name gets its column, about 170 units: 21 characters at 14 units, which is
 * "Lebensmitteldatenbank", the longest label with no space in it. A longer one is broken in two by
 * `splitLabel`. The arrow names sit beside their arrows in the gaps, and those gaps are measured
 * against "la página" and "Tagebuch, verschlüsselt".
 *
 * ── THE STEPS, AND WHY THE LEGEND IS IN THIS FILE ──
 * `DataFlowSteps` below is the numbered legend, and it is HTML beside the drawing, not in it. The
 * two are lit by ONE set of keyframes in the `<style>` inside the drawing: the same duration, the
 * same four delays, started on the same first paint. So the step that glows in the drawing and the
 * step that is highlighted in the legend are the same step, with no script. Render the legend
 * without the drawing and it is simply a still list.
 *
 * ── MOTION ──
 * See `frame.tsx`: the base rule is the finished picture. Every step's teal route, arrowheads and
 * badge are VISIBLE in their base rule, and the loop hides the three that are not the current
 * step. So with motion off the reader sees all four steps lit at once and every legend item in its
 * normal state, which is the complete claim. The packets are invisible in their base rule, as in
 * every drawing here. Only opacity and `stroke-dashoffset` move.
 */
import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';
import { splitLabel } from './label-lines';

/**
 * The drawing's aspect ratio, for the wrapper that reserves its box before the first paint. It is
 * the `viewBox` below as a Tailwind class; change one and change the other.
 */
export const DATA_FLOW_BOX = 'aspect-[360/374]';

export interface DataFlowProps extends IllustrationProps {
  /** The browser window in the middle. "Your device". */
  device: string;
  /** Top left, the box that keeps nothing. "openplate app server". */
  appServer: string;
  /** Bottom right. "openplate-core". */
  sync: string;
  /** Bottom left. "Your AI endpoint". */
  aiEndpoint: string;
  /** Top right. "Food database". */
  foodDb: string;
  /** Beside the arrow into the device, about nine characters. "the page". */
  pageEdge: string;
  /** Beside the arrow to openplate-core, broken in two past 18 characters. "diary, encrypted". */
  diaryEdge: string;
  /** Beside the arrow to the AI endpoint, about eight characters. "photo". */
  photoEdge: string;
  /** Beside the arrow to the app server, about seven characters. "names". */
  namesEdge: string;
}

/** The four steps, in the order the loop runs them. */
export type DataFlowStepId = 'log' | 'scan' | 'sync' | 'stays';

const STEP_IDS = ['log', 'scan', 'sync', 'stays'] as const satisfies readonly DataFlowStepId[];

export interface DataFlowStep {
  /** One line. "You log a food". */
  title: string;
  /** At most one sentence. */
  body: string;
}

/*
 * One clock for the drawing and the legend: 14 seconds, a quarter each. Every step runs the same
 * keyframes, and its delay puts its quarter in place. The delays are NEGATIVE on purpose: a
 * positive delay with no fill mode shows the base rule until it starts, and under reduced motion,
 * which runs each animation once in 0.01ms, a negative delay means the animation is already over
 * and the element shows its base rule at once.
 *
 *   on     : a step's teal layer, and a legend item's highlight. In for 3 percent, held to 22, out by
 *            25. Visible in the base rule on the drawing, invisible on the highlight (`op-df-lit`).
 *   draw   : the teal route draws itself in over the first 10 percent. `pathLength` is 100 on every
 *            route, so one set of numbers serves routes of any length.
 *   packet : a zero length dash with a square cap, so a square of the stroke's width, carried from
 *            the start of the route to its end between 8 and 22 percent.
 *
 * The delay rules come AFTER the `animation` shorthands: the shorthand resets the delay, and the
 * two selectors are equally specific, so the later one wins.
 *
 * `.op-df-label` is the label size, stepped down from `lg` as the header comment explains.
 */
const MOTION = `
.op-df-label { font-size: 14px; }
@media (min-width: 64rem) { .op-df-label { font-size: 9.5px; } }
.op-df-on { animation: op-df-on 14s linear infinite; }
.op-df-lit { opacity: 0; animation: op-df-on 14s linear infinite; }
.op-df-trace { stroke-dasharray: 100 100; animation: op-df-draw 14s linear infinite; }
.op-df-packet { opacity: 0; stroke-dasharray: 0.001 200; animation: op-df-packet 14s linear infinite; }
.op-df-scan, .op-df-scan * { animation-delay: -10.5s; }
.op-df-sync, .op-df-sync * { animation-delay: -7s; }
.op-df-stays, .op-df-stays * { animation-delay: -3.5s; }
@keyframes op-df-on {
  0% { opacity: 0; }
  3%, 22% { opacity: 1; }
  25%, 100% { opacity: 0; }
}
@keyframes op-df-draw {
  0% { stroke-dashoffset: 100; }
  10%, 100% { stroke-dashoffset: 0; }
}
@keyframes op-df-packet {
  0%, 8% { opacity: 0; stroke-dashoffset: 0; }
  10%, 20% { opacity: 1; }
  22%, 100% { opacity: 0; stroke-dashoffset: -100; }
}
`;

/*
 * The routes, written once, because each is drawn three times: quiet in the base layer, teal in
 * its step, and as the track its packet runs on. The names route runs up into the app server and
 * out of its right side; the tiles are filled, so the part inside the box is hidden, and so is the
 * packet while it crosses. That is "passes them on", drawn.
 */
const ROUTE = {
  page: 'M82 100 V143',
  names: 'M110 144 V74 H203',
  photo: 'M90 234 V277',
  diary: 'M270 234 V277',
} as const;

/** The arrowheads, each at the end of its route above. */
const HEAD = {
  page: 'M77 137 L82 143 L87 137',
  namesUp: 'M105 107 L110 101 L115 107',
  namesRight: 'M197 69 L203 74 L197 79',
  photo: 'M85 271 L90 277 L95 271',
  diary: 'M265 271 L270 277 L275 271',
} as const;

/** Where each step's number sits: on its route, or in the device's title bar for the fourth. */
const BADGE = {
  log: { cx: 110, cy: 122 },
  scan: { cx: 90, cy: 256 },
  sync: { cx: 270, cy: 256 },
  stays: { cx: 326, cy: 156 },
} as const satisfies Record<DataFlowStepId, { cx: number; cy: number }>;

/** The four boxes around the device, as the top left corner of a 132 by 52 tile. */
const TILE = {
  appServer: { x: 24, y: 48 },
  foodDb: { x: 204, y: 48 },
  aiEndpoint: { x: 24, y: 278 },
  sync: { x: 204, y: 278 },
} as const;

export function DataFlow({
  device,
  appServer,
  sync,
  aiEndpoint,
  foodDb,
  pageEdge,
  diaryEdge,
  photoEdge,
  namesEdge,
  className,
  label,
}: DataFlowProps) {
  return (
    <svg {...SVG_ROOT} {...frameAttributes(label)} viewBox="0 0 360 374" className={className}>
      <style>{MOTION}</style>

      {/* ── THE QUIET ROUTES ──
          Every step's route, muted and thin, so the whole map is there while one step is lit. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2} opacity={0.55}>
        <path d={ROUTE.names} />
        <path d={ROUTE.photo} />
        <path d={ROUTE.diary} />
      </g>

      {/* The page arrow: into the device, muted, and never lit, because it carries the app and
          nothing of yours. It is not a step. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2}>
        <path d={ROUTE.page} />
        <path d={HEAD.page} />
      </g>

      {/* ── THE TEAL ROUTES AND THEIR PACKETS, UNDER THE BOXES ── */}
      <StepRoute step="log" d={ROUTE.names} />
      <StepRoute step="scan" d={ROUTE.photo} />
      <StepRoute step="sync" d={ROUTE.diary} />

      {/* ── THE FOUR BOXES ──
          Filled with the card colour, so the graph paper behind the drawing stops at their edge
          and the names route disappears inside the app server. */}
      <g className="text-foreground">
        {Object.values(TILE).map((tile) => (
          <rect
            key={`${tile.x}-${tile.y}`}
            x={tile.x}
            y={tile.y}
            width="132"
            height="52"
            className="fill-card"
            stroke="currentColor"
            strokeWidth={2}
          />
        ))}
      </g>
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.75}>
        {/* The app server: a dashed and empty interior, because there is no database, no account
            and no diary inside it. */}
        <rect x="68" y="62" width="44" height="24" strokeDasharray="4 4" />
        {/* The food database: a cylinder, the one shape everybody reads as a database. */}
        <ellipse cx="270" cy="63" rx="16" ry="5" />
        <path d="M254 63 V85 a16 5 0 0 0 32 0 V63" />
        <path d="M254 74 a16 5 0 0 0 32 0" />
        {/* The AI endpoint: a chip, deliberately not a cloud. The same box stands for a provider
            you hold a key with, an openplate-inference machine of your own, or a managed
            instance's proxy, and the words around the drawing say which. */}
        <rect x="78" y="292" width="24" height="24" />
        <rect x="85" y="299" width="10" height="10" />
        <path d="M84 292 V288 M90 292 V288 M96 292 V288" />
        <path d="M84 316 V320 M90 316 V320 M96 316 V320" />
        <path d="M78 298 H74 M78 304 H74 M78 310 H74" />
        <path d="M102 298 H106 M102 304 H106 M102 310 H106" />
        {/* openplate-core: two stacked drives and no rows, because what arrives is ciphertext. */}
        <rect x="252" y="290" width="36" height="11" />
        <rect x="252" y="306" width="36" height="11" />
        <path d="M259 295.5 h0.01 M259 311.5 h0.01" strokeWidth={3} />
      </g>

      {/* ── THE DEVICE, AS A BROWSER WINDOW ──
          Drawn open: the screen shows a photo you could look at and rows you could read, because
          that is what "in the clear, on your device" means. */}
      <g className="text-foreground">
        <rect x="16" y="144" width="328" height="90" className="fill-card" stroke="currentColor" strokeWidth={2} />
        <path d="M16 168 H344" fill="none" stroke="currentColor" strokeWidth={1.5} />
      </g>
      <g className="text-muted-foreground">
        <circle cx="29" cy="156" r="2.5" fill="currentColor" />
        <circle cx="38" cy="156" r="2.5" fill="currentColor" />
        <circle cx="47" cy="156" r="2.5" fill="currentColor" />
      </g>
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.75}>
        <DevicePhoto />
        <DeviceDiary />
      </g>

      {/* ── THE QUIET ARROWHEADS AND NUMBERS, OVER THE BOXES ── */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2} opacity={0.55}>
        <path d={HEAD.namesUp} />
        <path d={HEAD.namesRight} />
        <path d={HEAD.photo} />
        <path d={HEAD.diary} />
      </g>
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.75}>
        <Padlock x={288} y={249} />
      </g>
      {STEP_IDS.map((step, index) => (
        <Badge key={step} {...BADGE[step]} number={index + 1} />
      ))}

      {/* ── EACH STEP'S TEAL LAYER, OVER THE BOXES ──
          The arrowheads, the number, the box it arrives at, and what it takes from the device. */}
      <g className="op-df-on op-df-log text-primary">
        <g {...DRAWN} strokeWidth={3}>
          <path d={HEAD.namesUp} />
          <path d={HEAD.namesRight} />
          <TileEdge {...TILE.foodDb} />
        </g>
        <LitBadge {...BADGE.log} number={1} />
      </g>
      <g className="op-df-on op-df-scan text-primary">
        <g {...DRAWN} strokeWidth={3}>
          <path d={HEAD.photo} />
          <TileEdge {...TILE.aiEndpoint} />
        </g>
        <g {...DRAWN} strokeWidth={1.75}>
          <DevicePhoto />
        </g>
        <LitBadge {...BADGE.scan} number={2} />
      </g>
      <g className="op-df-on op-df-sync text-primary">
        <g {...DRAWN} strokeWidth={3}>
          <path d={HEAD.diary} />
          <TileEdge {...TILE.sync} />
        </g>
        <g {...DRAWN} strokeWidth={1.75}>
          <DeviceDiary />
          <Padlock x={288} y={249} />
        </g>
        <LitBadge {...BADGE.sync} number={3} />
      </g>
      <g className="op-df-on op-df-stays text-primary">
        <g {...DRAWN} strokeWidth={3}>
          <rect x="16" y="144" width="328" height="90" />
        </g>
        <g {...DRAWN} strokeWidth={1.75}>
          <DevicePhoto />
          <DeviceDiary />
        </g>
        <LitBadge {...BADGE.stays} number={4} />
      </g>

      {/* ── THE WORDS ──
          The top row's names sit ABOVE their boxes and the bottom row's BELOW, so the gaps next to
          the device stay free for the arrows and their names. */}
      <g className="op-df-label fill-current text-foreground" fontWeight={500}>
        <Label x={90} y={40} text={appServer} place="above" />
        <Label x={270} y={40} text={foodDb} place="above" />
        <Label x={90} y={348} text={aiEndpoint} place="below" />
        <Label x={270} y={348} text={sync} place="below" />
        <text x="180" y="161" textAnchor="middle">
          {device}
        </text>
      </g>
      <g className="op-df-label fill-current text-muted-foreground">
        <text x="74" y="126" textAnchor="end">
          {pageEdge}
        </text>
        <text x="128" y="127">
          {namesEdge}
        </text>
        <text x="72" y="261" textAnchor="end">
          {photoEdge}
        </text>
        <Label x={252} y={256} text={diaryEdge} place="centre" anchor="end" maxLineLength={18} />
      </g>
    </svg>
  );
}

/**
 * The numbered legend the drawing runs through, one item per step.
 *
 * An `<ol>`, so the order is in the markup and a screen reader counts it; the drawn number beside
 * each item is `aria-hidden` for that reason. The highlight is a layer behind the words that fades
 * in and out on the drawing's clock, so an item never changes size and nothing moves. Its base
 * rule is invisible: with motion off, every item is in its normal state.
 */
export function DataFlowSteps({
  steps,
  className,
}: {
  steps: Readonly<Record<DataFlowStepId, DataFlowStep>>;
  className?: string;
}) {
  return (
    <ol className={className}>
      {STEP_IDS.map((id, index) => (
        <li key={id} className={`op-df-${id} relative flex gap-4 p-4`}>
          <span aria-hidden="true" className="op-df-lit absolute inset-0 border border-primary bg-card shadow-sm" />
          <span
            aria-hidden="true"
            className="relative grid size-7 shrink-0 place-items-center border border-border bg-card text-sm font-semibold"
          >
            {index + 1}
            <span className="op-df-lit absolute inset-0 grid place-items-center bg-primary text-primary-foreground">
              {index + 1}
            </span>
          </span>
          <div className="relative min-w-0">
            <p className="leading-snug font-semibold">{steps[id].title}</p>
            <p className="mt-1 font-prose text-sm leading-relaxed text-muted-foreground">{steps[id].body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** A step's teal route, drawn in, and the packet that runs it. */
function StepRoute({ step, d }: { step: DataFlowStepId; d: string }) {
  return (
    <g className={`op-df-on op-df-${step} text-primary`} {...DRAWN}>
      <path className="op-df-trace" d={d} pathLength={100} strokeWidth={3} />
      <path className="op-df-packet" d={d} pathLength={100} strokeWidth={9} strokeLinecap="square" />
    </g>
  );
}

/** The teal edge a step draws around the box it arrives at. */
function TileEdge({ x, y }: { x: number; y: number }) {
  return <rect x={x} y={y} width="132" height="52" />;
}

/** A step's number, quiet: a card square with a muted edge. */
function Badge({ cx, cy, number }: { cx: number; cy: number; number: number }) {
  return (
    <g>
      <rect
        x={cx - 10}
        y={cy - 10}
        width="20"
        height="20"
        className="fill-card text-muted-foreground"
        stroke="currentColor"
        strokeWidth={1.5}
      />
      <text
        x={cx}
        y={cy + 4.5}
        textAnchor="middle"
        fontSize="13"
        fontWeight={600}
        className="fill-current text-foreground"
      >
        {number}
      </text>
    </g>
  );
}

/** A step's number, lit: a teal square. Painted over the quiet one. */
function LitBadge({ cx, cy, number }: { cx: number; cy: number; number: number }) {
  return (
    <g>
      <rect x={cx - 10} y={cy - 10} width="20" height="20" fill="currentColor" />
      <text
        x={cx}
        y={cy + 4.5}
        textAnchor="middle"
        fontSize="13"
        fontWeight={600}
        className="fill-current text-primary-foreground"
      >
        {number}
      </text>
    </g>
  );
}

/**
 * A name on one line or two.
 *
 * `place` says where the block sits against `y`: `above` ends on it, `below` starts on it, `centre`
 * straddles it. The offsets are in `em`, so the block keeps its shape when the label size steps
 * down from `lg`.
 */
function Label({
  x,
  y,
  text,
  place,
  anchor = 'middle',
  maxLineLength = 20,
}: {
  x: number;
  y: number;
  text: string;
  place: 'above' | 'below' | 'centre';
  anchor?: 'start' | 'middle' | 'end';
  maxLineLength?: number;
}) {
  const lines = splitLabel({ text, maxLineLength });
  const first = firstLineOffset({ count: lines.length, place });
  return (
    <text x={x} y={y} textAnchor={anchor}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={`${index === 0 ? first : 1.2}em`}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/** How far the first line's baseline sits from `y`, in `em`, for a block of `count` lines. */
function firstLineOffset({ count, place }: { count: number; place: 'above' | 'below' | 'centre' }): number {
  if (place === 'below') return 0;
  if (place === 'above') return -(count - 1) * 1.2;
  return 0.35 - (count - 1) * 0.6;
}

/** The plate photo on the device's screen, above the route it leaves by. */
function DevicePhoto() {
  return (
    <g>
      <rect x="32" y="178" width="60" height="46" />
      <circle cx="45" cy="190" r="4" />
      <path d="M34 220 L52 201 L64 212 L73 205 L90 220" />
    </g>
  );
}

/** Three diary entries on the device's screen, each a food mark and two lines written beside it. */
function DeviceDiary() {
  return (
    <g>
      {[186, 202, 218].map((y) => (
        <g key={y}>
          <rect x="112" y={y - 6} width="12" height="12" />
          <path d={`M132 ${y - 3} H326`} />
          <path d={`M132 ${y + 3} H262`} />
        </g>
      ))}
    </g>
  );
}

/** The seal on the diary route: AES-256-GCM under a key derived from a passphrase, drawn small. */
function Padlock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="1" y="6" width="12" height="9" />
      <path d="M4 6 V4.5 a3 3 0 0 1 6 0 V6" />
    </g>
  );
}
