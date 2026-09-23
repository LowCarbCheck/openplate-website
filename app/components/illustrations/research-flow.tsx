/**
 * The research page's hero drawing: a diary on a phone, a consent gate, and a study's dataset.
 *
 * ── WHAT IT SAYS ──
 * Entries leave the participant's device only through consent, and only then reach the study. The
 * gate is a shield with a check, in the middle of the one route, so nothing in the picture reaches
 * the table without passing it. It restates the `why` and `offer` cards under it and adds no claim
 * of its own, so it takes no text props and draws no words: the page says all of it in the reader's
 * language, and the default `label` of `undefined` keeps it out of a screen reader's way.
 *
 * ── THE GRID ──
 * 440 by 300 user units. Phone at x 24 to 112, gate centred on x 220, table at x 316 to 420, and all
 * three centred on y 150, so both connectors are horizontal and a dot only ever needs a translateX.
 *
 * ── PAINT AND MOTION, BOTH BY THE RULES IN `frame.tsx` ──
 * `currentColor` everywhere, from Tailwind text tokens. Teal goes on the check and on the moving
 * dots and nowhere else. The dots are invisible in the base rule, so with motion off the drawing is
 * the phone, the gate and the table joined by two arrows, which is the whole message. Each dot makes
 * the journey in two legs on one clock, the second leg starting after the gate, like the names
 * tokens in `data-flow.tsx`. Negative delays put three dots on the route at first paint.
 */
import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';

/*
 * `translateX` distances are `viewBox` units and match the connectors below:
 *   in  : x 124 to 176, so 52 across, ending at the gate.
 *   out : x 264 to 304, so 40 across, ending at the table.
 */
const MOTION = `
.op-rf-dot { opacity: 0; }
.op-rf-in { animation: op-rf-in 6.6s linear infinite; }
.op-rf-out { animation: op-rf-out 6.6s linear infinite; }
.op-rf-second { animation-delay: -2.2s; }
.op-rf-third { animation-delay: -4.4s; }
@keyframes op-rf-in {
  0% { transform: translateX(0); opacity: 0; }
  8% { opacity: 1; }
  36% { opacity: 1; }
  44% { transform: translateX(52px); opacity: 0; }
  100% { transform: translateX(52px); opacity: 0; }
}
@keyframes op-rf-out {
  0%, 52% { transform: translateX(0); opacity: 0; }
  60% { opacity: 1; }
  86% { opacity: 1; }
  94% { transform: translateX(40px); opacity: 0; }
  100% { transform: translateX(40px); opacity: 0; }
}
`;

/** The three dots, one class each, so the stagger lives in the stylesheet above. */
const STAGGER = ['', 'op-rf-second', 'op-rf-third'] as const;

export function ResearchFlow({ className, label }: IllustrationProps) {
  return (
    <svg {...SVG_ROOT} {...frameAttributes(label)} viewBox="0 0 440 300" className={className}>
      <style>{MOTION}</style>

      {/* ── THE PHONE ── The participant's diary, drawn legible, as in `data-flow.tsx`. */}
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="24" y="54" width="88" height="192" rx="14" />
        <path d="M58 64 H78" strokeWidth={2.5} />
      </g>
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.6}>
        <rect x="33" y="74" width="70" height="160" rx="6" />
        <DiaryRow y={94} />
        <DiaryRow y={120} />
        <DiaryRow y={146} />
        <DiaryRow y={172} />
        <DiaryRow y={198} />
      </g>

      {/* ── THE TWO CONNECTORS ── Muted, because the line is the route and not the traffic. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.6}>
        <path d="M120 150 H178" />
        <path d="M173 145.5 L178.5 150 L173 154.5" />
        <path d="M260 150 H306" />
        <path d="M301 145.5 L306.5 150 L301 154.5" />
      </g>

      {/* ── THE GATE ── A shield, and the check in it is the one teal line that does not move. */}
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <path d="M220 104 L254 117 V146 C254 170 239 186 220 196 C201 186 186 170 186 146 V117 Z" />
      </g>
      <g className="text-primary" {...DRAWN} strokeWidth={2.5}>
        <path d="M206 150 L216 160 L235 139" />
      </g>

      {/* ── THE STUDY'S DATASET ── A table: a shaded header row, a column rule, and short values. */}
      <rect x="316" y="90" width="104" height="24" className="fill-current text-muted" />
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="316" y="90" width="104" height="120" />
      </g>
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.4}>
        <path d="M316 114 H420 M316 138 H420 M316 162 H420 M316 186 H420" />
        <path d="M352 90 V210" />
        <path d="M326 102 H342 M362 102 H398" strokeWidth={2} />
        <TableRow y={126} width={30} />
        <TableRow y={150} width={44} />
        <TableRow y={174} width={22} />
        <TableRow y={198} width={36} />
      </g>

      {/* ── THE TRAFFIC ── Three dots, each in two legs: to the gate, then from it to the table. */}
      {STAGGER.map((extra) => (
        <g key={`in-${extra}`} className={`op-rf-dot op-rf-in ${extra} text-primary`}>
          <circle cx="124" cy="150" r="3.5" fill="currentColor" />
        </g>
      ))}
      {STAGGER.map((extra) => (
        <g key={`out-${extra}`} className={`op-rf-dot op-rf-out ${extra} text-primary`}>
          <circle cx="264" cy="150" r="3.5" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** One diary entry on the phone's screen: a food mark and two lines written beside it. */
function DiaryRow({ y }: { y: number }) {
  return (
    <g>
      <rect x="41" y={y - 6} width="12" height="12" rx="3" />
      <path d={`M59 ${y - 3} H95`} />
      <path d={`M59 ${y + 3} H83`} />
    </g>
  );
}

/** One record in the table: a short id in the first column, a value of `width` units in the second. */
function TableRow({ y, width }: { y: number; width: number }) {
  return <path d={`M326 ${y} H338 M362 ${y} H${362 + width}`} />;
}
