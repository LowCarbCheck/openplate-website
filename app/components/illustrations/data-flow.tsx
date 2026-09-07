/**
 * The three arrows, which are the whole architecture and the page's whole claim.
 *
 * ── WHAT THIS DRAWING ASSERTS, AND WHY EVERY LINE OF IT IS CHECKABLE ──
 * It is `docs/architecture.md`'s own flowchart, drawn rather than generated, and it says exactly
 * what that document says and nothing more:
 *
 *   1. The device in the middle holds the diary, in the clear, because it is your device. The
 *      screen inside it is drawn LEGIBLE for that reason: rows you could read, and a photo.
 *   2. The diary leaves for openplate-sync sealed. The token that travels that arrow is a padlock
 *      and the block under it is opaque, because the server stores bytes it holds no key for.
 *   3. The photo leaves for whichever AI endpoint you configured, directly.
 *   4. The app server sends the page and stands on neither of those paths. That is drawn three
 *      ways at once, because it is the claim a reader is most entitled to disbelieve: it is on the
 *      far side of the device, its arrow points INTO the device rather than out of it, its line is
 *      the muted colour the two payload paths are not, and its box is empty behind a dashed edge
 *      because it holds nothing. Nothing in this file draws a line between it and either payload.
 *
 * A drawing that put the server between the device and the sync server, or routed the photo
 * through it, would be a lie on the front page. That is why the geometry below is written out and
 * commented rather than assembled from a layout engine.
 *
 * ── THE GRID ──
 * 520 by 272 user units, and every number below is in them. Read the columns left to right: the
 * app server at x 8 to 112, the device at 196 to 300, and the two destinations at 320 to 504. The
 * two payload routes are orthogonal on purpose, not diagonal: an axis aligned arrowhead needs no
 * rotation and a travelling token needs no `offset-path`, so the file has no geometry that only a
 * browser can work out.
 *
 * ── HOW WIDE IT NEEDS TO BE, WHICH IS A REAL CONSTRAINT AND NOT A PREFERENCE ──
 * The type in here is 11 to 12 user units on a 520 unit grid, so it renders at the drawing's own
 * width divided by about 44. Below roughly 480 pixels the arrow names drop under 11 pixels and the
 * drawing stops being readable, exactly as the topology diagram did inside the 48rem column before
 * M197. On a phone this wants `FullWidth` from `app/components/page.tsx`, or the same horizontally
 * scrolling wrapper `doc-blocks.tsx` gives a mermaid drawing. Shrinking it to fit a 360 pixel
 * column produces a picture nobody can read, which is worth less than the paragraph it sits under.
 *
 * The four node names and the three arrow names arrive as REQUIRED props. This site is German at
 * `/`, English at `/en/` and French at `/fr/`, and a drawing with an English word baked into it is
 * a drawing that is wrong on two thirds of the site. Keep the three arrow names to two or three
 * words: `pageEdge` is centred over a 72 unit run and the other two grow rightwards from a fixed
 * point, so a sentence would collide with the boxes.
 *
 * ── MOTION ──
 * One token per arrow, looping, invisible in its base rule. See `frame.tsx` for why that is the
 * rule and not a preference. Turn motion off and the drawing is three labelled arrows between four
 * labelled boxes, which is the entire message: the tokens say how often, never what.
 */
import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';

export interface DataFlowProps extends IllustrationProps {
  /** The phone in the middle. "Your device". */
  device: string;
  /** The stateless box on the left. "openplate app server". */
  appServer: string;
  /** Top right. "openplate-sync". */
  sync: string;
  /** Bottom right. "Your AI endpoint". */
  aiEndpoint: string;
  /** On the arrow into the device, two or three words. "the page". */
  pageEdge: string;
  /** On the arrow to the sync server, two or three words. "diary, encrypted". */
  diaryEdge: string;
  /** On the arrow to the AI endpoint, one or two words. "photo". */
  photoEdge: string;
}

/*
 * The keyframes and the geometry are one thing in two languages, so they live in one file.
 *
 * `translate` distances here are `viewBox` units, which is what a CSS pixel means inside an SVG
 * transform, and they are the same numbers as the `d` attributes below:
 *   page  : x 118 to 182, so 64 across.
 *   diary : x 306 to 396, so 90 across, then y 110 to 88, so 22 up.
 *   photo : x 306 to 396, so 90 across, then y 162 to 184, so 22 down.
 * Move an arrow and you move its keyframe. There is no way to derive one from the other in CSS,
 * so the pairing is written here instead of being left to be discovered.
 */
const MOTION = `
.op-df-token { opacity: 0; }
.op-df-page { animation: op-df-page 3.6s linear infinite; }
.op-df-diary { animation: op-df-diary 4.2s linear infinite; }
.op-df-photo { animation: op-df-photo 4.2s linear infinite 1.6s; }
@keyframes op-df-page {
  0% { transform: translateX(0); opacity: 0; }
  12% { opacity: 1; }
  82% { opacity: 1; }
  100% { transform: translateX(64px); opacity: 0; }
}
@keyframes op-df-diary {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 1; }
  60% { transform: translate(90px, 0); }
  86% { transform: translate(90px, -22px); opacity: 1; }
  100% { transform: translate(90px, -22px); opacity: 0; }
}
@keyframes op-df-photo {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 1; }
  60% { transform: translate(90px, 0); }
  86% { transform: translate(90px, 22px); opacity: 1; }
  100% { transform: translate(90px, 22px); opacity: 0; }
}
`;

export function DataFlow({
  device,
  appServer,
  sync,
  aiEndpoint,
  pageEdge,
  diaryEdge,
  photoEdge,
  className,
  label,
}: DataFlowProps) {
  return (
    <svg {...SVG_ROOT} {...frameAttributes(label)} viewBox="0 0 520 272" className={className}>
      <style>{MOTION}</style>

      {/* ── THE APP SERVER, WHICH IS THE ONE BOX THAT HOLDS NOTHING ──
          A solid edge because the container is real, and a dashed empty interior because there is
          no database, no account and no secret inside it. Muted, so the eye reads it as the part
          of the picture that is not carrying anything. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="8" y="100" width="104" height="56" rx="10" />
        <rect x="24" y="114" width="72" height="28" rx="6" strokeDasharray="4 5" strokeWidth={1.5} />
      </g>
      {/* ── LEFT ALIGNED, AND THAT IS NOT A STYLE CHOICE ──
          Centred under the box, this name runs off the left edge of the drawing the moment it is
          longer than about seventeen characters, which German and French both are: "openplate
          App-Server" was clipped in the first render. Anchored at the start it grows rightwards
          into 180 units of empty space instead, which is about thirty characters, and it reads as
          a caption under a box rather than as a mistake. */}
      <text x="10" y="176" fontSize="11.5" fontWeight={500} className="fill-current text-foreground">
        {appServer}
      </text>

      {/* The page arrow: into the device, muted, and the only arrow on this side of the drawing. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2}>
        <path d="M116 128 H186" />
        <path d="M181 123.5 L186.5 128 L181 132.5" />
      </g>
      <text x="151" y="118" textAnchor="middle" fontSize="11" className="fill-current text-muted-foreground">
        {pageEdge}
      </text>
      <g className="op-df-token op-df-page text-muted-foreground">
        <Packet x={118} y={128} />
      </g>

      {/* ── THE DEVICE ──
          Drawn open: the screen shows rows you could read and a photo you could look at, because
          that is what "in the clear, on your device" means and it is the honest half of the local
          first promise. */}
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="196" y="48" width="104" height="176" rx="16" />
        <path d="M234 58 H262" strokeWidth={2.5} />
      </g>
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={1.6}>
        <rect x="206" y="68" width="84" height="142" rx="8" />
        <DiaryRow y={84} />
        <DiaryRow y={106} />
        <DiaryRow y={128} />
        {/* The plate photo, on the device that took it: excluded from the export and from the
            sync payload alike, which is why no arrow in this drawing carries it anywhere but to
            the endpoint the reader chose. */}
        <rect x="216" y="150" width="64" height="46" rx="6" />
        <circle cx="228" cy="163" r="3.5" />
        <path d="M217 190 L233 174 L243 184 L252 177 L279 195" />
      </g>
      <text x="248" y="246" textAnchor="middle" fontSize="12" fontWeight={500} className="fill-current text-foreground">
        {device}
      </text>

      {/* ── THE TWO PAYLOAD ROUTES ──
          Primary coloured, and both leaving the device's right edge: the two things that ever go
          anywhere, going there directly. */}
      <g className="text-primary" {...DRAWN} strokeWidth={2}>
        <path d="M306 110 H396 V83" />
        <path d="M391.5 82.5 L396 76 L400.5 82.5" />
        <path d="M306 162 H396 V189" />
        <path d="M391.5 189.5 L396 196 L400.5 189.5" />
      </g>

      {/* The arrow names, each with the glyph for what actually travels: a sealed padlock on one,
          a photo on the other. The glyph is static and the token is not, so the meaning survives
          for a reader whose motion is off. */}
      <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
        <Padlock x={306} y={118} />
        <Photo x={306} y={142} />
      </g>
      <text x="326" y="128" fontSize="11" className="fill-current text-muted-foreground">
        {diaryEdge}
      </text>
      <text x="326" y="152" fontSize="11" className="fill-current text-muted-foreground">
        {photoEdge}
      </text>

      <g className="op-df-token op-df-diary text-primary">
        <Packet x={306} y={110} />
      </g>
      <g className="op-df-token op-df-photo text-primary">
        <Packet x={306} y={162} />
      </g>

      {/* ── THE SYNC SERVER ──
          Two stacked drives, and one opaque block with a padlock on it. Not rows, not text: the
          one thing this server holds of yours is ciphertext it has no key for. */}
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="320" y="20" width="184" height="56" rx="10" />
      </g>
      <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
        <rect x="336" y="36" width="24" height="10" rx="3" />
        <rect x="336" y="50" width="24" height="10" rx="3" />
        <path d="M341 41 h0.01" strokeWidth={2.5} />
        <path d="M341 55 h0.01" strokeWidth={2.5} />
      </g>
      <text x="372" y="53" fontSize="12" fontWeight={500} className="fill-current text-foreground">
        {sync}
      </text>

      {/* ── THE AI ENDPOINT ──
          A chip, and deliberately not a cloud: the same box stands for a provider you hold a key
          with, an openplate-inference machine of your own, or a managed instance's proxy. Which
          one it is, is the reader's decision and the words around this drawing make it. */}
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="320" y="196" width="184" height="56" rx="10" />
      </g>
      <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
        <rect x="336" y="212" width="24" height="24" rx="4" />
        <rect x="343" y="219" width="10" height="10" rx="2" />
        <path d="M342 212 V208 M348 212 V208 M354 212 V208" />
        <path d="M342 236 V240 M348 236 V240 M354 236 V240" />
        <path d="M336 218 H332 M336 224 H332 M336 230 H332" />
        <path d="M360 218 H364 M360 224 H364 M360 230 H364" />
      </g>
      <text x="372" y="229" fontSize="12" fontWeight={500} className="fill-current text-foreground">
        {aiEndpoint}
      </text>
    </svg>
  );
}

/** One line of the diary on the device's screen: an entry, and something legible written on it. */
function DiaryRow({ y }: { y: number }) {
  return (
    <g>
      <rect x="216" y={y - 6} width="12" height="12" rx="3" />
      <path d={`M234 ${y - 3} H280`} />
      <path d={`M234 ${y + 3} H266`} />
    </g>
  );
}

/**
 * What travels an arrow.
 *
 * A rounded square and not a padlock or a photo, on purpose: the glyph beside the arrow's name
 * already says WHAT is travelling, and a second copy of it moving along the line says the same
 * thing louder rather than saying more. This says "and it goes there, repeatedly".
 */
function Packet({ x, y }: { x: number; y: number }) {
  return <rect x={x - 4} y={y - 4} width="8" height="8" rx="2.5" fill="currentColor" />;
}

/** The seal on the diary arrow. AES-256-GCM under a key derived from a passphrase, drawn small. */
function Padlock({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="1" y="6" width="12" height="8" rx="2" />
      <path d="M4 6 V4.5 a3 3 0 0 1 6 0 V6" />
    </g>
  );
}

/** The plate photo on the other arrow: read in the browser, posted straight on, never stored. */
function Photo({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0.5" y="1.5" width="13" height="11" rx="2" />
      <circle cx="4.5" cy="5.5" r="1.2" />
      <path d="M1.5 11.5 L5.5 7.5 L8 10 L10 8.5 L13 11.5" />
    </g>
  );
}
