/**
 * The five arrows, which are the whole architecture and the page's whole claim.
 *
 * ── WHAT THIS DRAWING ASSERTS, AND WHY EVERY LINE OF IT IS CHECKABLE ──
 * It is `docs/architecture.md`'s own flowchart, drawn rather than generated, and it says exactly
 * what that document says and nothing more:
 *
 *   1. The device in the middle holds the diary, in the clear, because it is your device. The
 *      screen inside it is drawn LEGIBLE for that reason: rows you could read, and a photo.
 *   2. The diary leaves for openplate-core sealed. The glyph on that arrow is a padlock, because
 *      what travels is ciphertext. The server also keeps the escrowed recovery code that can open
 *      it, which is a matter of what it STORES, and `data-holders.tsx` draws that.
 *   3. The photo leaves for whichever AI endpoint you configured, directly.
 *   4. The names of the foods you look up leave for the app server, which passes them on to the
 *      food database under it. Both arrows are primary, because a food name is something of yours
 *      in transit, and the app server's box stays empty behind a dashed edge, because it keeps
 *      none of them.
 *   5. The app server sends the page and stands on neither the diary path nor the photo path. That
 *      is drawn three ways at once, because it is the claim a reader is most entitled to
 *      disbelieve: it is on the far side of the device from both, the page arrow is the muted
 *      colour the payload paths are not, and the only lines that touch its box are the page and
 *      the names. Nothing in this file draws a line between it and the diary or the photo.
 *
 * A drawing that put the server between the device and the sync server, or routed the photo
 * through it, would be a lie on the front page. So would one that left the names out, now that
 * they pass through it. That is why the geometry below is written out and commented rather than
 * assembled from a layout engine.
 *
 * ── THE GRID ──
 * 520 by 308 user units, and every number below is in them. Read the columns left to right: the
 * app server at x 8 to 112 with the food database under it, the device at 196 to 300, and the two
 * destinations at 320 to 504. Every route is orthogonal on purpose, not diagonal: an axis aligned
 * arrowhead needs no rotation and a travelling token needs no `offset-path`, so the file has no
 * geometry that only a browser can work out.
 *
 * ── HOW WIDE IT NEEDS TO BE, WHICH IS A REAL CONSTRAINT AND NOT A PREFERENCE ──
 * The type in here is 11 to 12 user units on a 520 unit grid, so it renders at the drawing's own
 * width divided by about 44. Below roughly 480 pixels the arrow names drop under 11 pixels and the
 * drawing stops being readable, exactly as the topology diagram did inside the 48rem column before
 * M197. On a phone this wants `FullWidth` from `app/components/page.tsx`, or the same horizontally
 * scrolling wrapper `doc-blocks.tsx` gives a mermaid drawing. Shrinking it to fit a 360 pixel
 * column produces a picture nobody can read, which is worth less than the paragraph it sits under.
 *
 * The five node names and the four arrow names arrive as REQUIRED props. This site is German at
 * `/`, English at `/en/` and French at `/fr/`, and a drawing with an English word baked into it is
 * a drawing that is wrong on two thirds of the site. Keep the arrow names to two or three words:
 * `pageEdge` and the first `namesEdge` are centred in the 84 unit gap between the app server and
 * the device. The names arrowhead sits inside that gap, so a centred `namesEdge` can be about 58
 * units wide, which is about nine characters at 11 units. The others grow rightwards from a fixed
 * point, so a sentence would collide with the boxes.
 *
 * ── MOTION ──
 * One token per arrow, looping, invisible in its base rule. See `frame.tsx` for why that is the
 * rule and not a preference. Turn motion off and the drawing is five labelled arrows between five
 * labelled boxes, which is the entire message: the tokens say how often, never what.
 */
import { DRAWN, frameAttributes, SVG_ROOT, type IllustrationProps } from './frame';

export interface DataFlowProps extends IllustrationProps {
  /** The phone in the middle. "Your device". */
  device: string;
  /** The stateless box on the left. "openplate app server". */
  appServer: string;
  /** Top right. "openplate-core". */
  sync: string;
  /** Bottom right. "Your AI endpoint". */
  aiEndpoint: string;
  /** Bottom left, under the app server. "Food database". */
  foodDb: string;
  /** On the arrow into the device, two or three words. "the page". */
  pageEdge: string;
  /** On the arrow to the sync server, two or three words. "diary, encrypted". */
  diaryEdge: string;
  /** On the arrow to the AI endpoint, one or two words. "photo". */
  photoEdge: string;
  /**
   * On both arrows of the names path. "names". One copy is centred between the app server and the
   * device, and the names arrowhead bounds it at about 58 units, which is about nine characters at
   * 11 units.
   */
  namesEdge: string;
}

/*
 * The keyframes and the geometry are one thing in two languages, so they live in one file.
 *
 * `translate` distances here are `viewBox` units, which is what a CSS pixel means inside an SVG
 * transform, and they are the same numbers as the `d` attributes below:
 *   page      : x 118 to 182, so 64 across.
 *   diary     : x 306 to 396, so 90 across, then y 110 to 88, so 22 up.
 *   photo     : x 306 to 396, so 90 across, then y 162 to 184, so 22 down.
 *   names in  : x 182 to 118, so 64 back.
 *   names out : y 162 to 206, so 44 down.
 * Move an arrow and you move its keyframe. There is no way to derive one from the other in CSS,
 * so the pairing is written here instead of being left to be discovered.
 *
 * The two names tokens are one journey in two legs. They share a duration and a delay, so they
 * stay in step: the first crosses to the app server in the first half of the cycle, and the second
 * leaves it for the food database in the second half. That is "passes them on", drawn.
 */
const MOTION = `
.op-df-token { opacity: 0; }
.op-df-page { animation: op-df-page 3.6s linear infinite; }
.op-df-diary { animation: op-df-diary 4.2s linear infinite; }
.op-df-photo { animation: op-df-photo 4.2s linear infinite 1.6s; }
.op-df-names-in { animation: op-df-names-in 4.8s linear infinite 0.8s; }
.op-df-names-out { animation: op-df-names-out 4.8s linear infinite 0.8s; }
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
@keyframes op-df-names-in {
  0% { transform: translateX(0); opacity: 0; }
  6% { opacity: 1; }
  40% { opacity: 1; }
  46% { transform: translateX(-64px); opacity: 0; }
  100% { transform: translateX(-64px); opacity: 0; }
}
@keyframes op-df-names-out {
  0%, 50% { transform: translateY(0); opacity: 0; }
  56% { opacity: 1; }
  90% { opacity: 1; }
  96% { transform: translateY(44px); opacity: 0; }
  100% { transform: translateY(44px); opacity: 0; }
}
`;

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
    <svg {...SVG_ROOT} {...frameAttributes(label)} viewBox="0 0 520 308" className={className}>
      <style>{MOTION}</style>

      {/* ── THE APP SERVER, WHICH IS THE BOX THAT KEEPS NOTHING OF YOURS ──
          A solid edge because the container is real, and a dashed empty interior because there is
          no database, no account and no diary inside it. The food names cross it and none of them
          stay. Muted, so the eye reads it as the part of the picture that is not holding anything. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="8" y="100" width="104" height="56" rx="10" />
        <rect x="24" y="114" width="72" height="28" rx="6" strokeDasharray="4 5" strokeWidth={1.5} />
      </g>
      {/* ── LEFT ALIGNED AND ABOVE THE BOX, AND NEITHER IS A STYLE CHOICE ──
          Centred, this name runs off the left edge of the drawing the moment it is longer than about
          seventeen characters, which German and French both are: "openplate App-Server" was
          clipped in the first render. Anchored at the start it grows rightwards into 180 units of
          empty space instead, which is about thirty characters. It sits above the box because the
          space under the box is where the names leave for the food database, and a caption there
          would have that arrow run through it. */}
      <text x="10" y="84" fontSize="11.5" fontWeight={500} className="fill-current text-foreground">
        {appServer}
      </text>

      {/* The page arrow: into the device, and muted, because it carries the app and nothing of
          yours. The upper of the two lines between the app server and the device. */}
      <g className="text-muted-foreground" {...DRAWN} strokeWidth={2}>
        <path d="M116 116 H186" />
        <path d="M181 111.5 L186.5 116 L181 120.5" />
      </g>
      <text x="151" y="106" textAnchor="middle" fontSize="11" className="fill-current text-muted-foreground">
        {pageEdge}
      </text>
      <g className="op-df-token op-df-page text-muted-foreground">
        <Packet x={118} y={116} />
      </g>

      {/* ── THE NAMES PATH, IN TWO LEGS ──
          Primary, because a food name is something of yours leaving the device. The first leg is
          the lower line between the device and the app server, pointing the other way from the
          page, with its name UNDER it so the two names never share a line. The second leg drops
          from the app server to the food database, with its name beside it. */}
      <g className="text-primary" {...DRAWN} strokeWidth={2}>
        <path d="M186 140 H116" />
        <path d="M121 135.5 L115.5 140 L121 144.5" />
        <path d="M60 160 V208" />
        <path d="M55.5 202.5 L60 208.5 L64.5 202.5" />
      </g>
      <text x="151" y="156" textAnchor="middle" fontSize="11" className="fill-current text-muted-foreground">
        {namesEdge}
      </text>
      <text x="70" y="188" fontSize="11" className="fill-current text-muted-foreground">
        {namesEdge}
      </text>
      <g className="op-df-token op-df-names-in text-primary">
        <Packet x={182} y={140} />
      </g>
      <g className="op-df-token op-df-names-out text-primary">
        <Packet x={60} y={162} />
      </g>

      {/* ── THE FOOD DATABASE ──
          Where the names end up. A cylinder, the one shape everybody reads as a database, and
          drawn like the two destinations on the right: a solid edge and a primary mark. What it
          keeps is a count per key and nothing of yours, which `data-holders.tsx` draws. Its name
          sits under it and grows rightwards, for the same reason the app server's does. */}
      <g className="text-foreground" {...DRAWN} strokeWidth={2}>
        <rect x="8" y="212" width="104" height="56" rx="10" />
      </g>
      <g className="text-primary" {...DRAWN} strokeWidth={1.6}>
        <ellipse cx="60" cy="228" rx="18" ry="5" />
        <path d="M42 228 V252 a18 5 0 0 0 36 0 V228" />
        <path d="M42 240 a18 5 0 0 0 36 0" />
      </g>
      <text x="10" y="288" fontSize="11.5" fontWeight={500} className="fill-current text-foreground">
        {foodDb}
      </text>

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

      {/* ── THE DIARY AND THE PHOTO ROUTES ──
          Primary coloured, and both leaving the device's right edge: the two payloads the app
          server never touches, going where they go directly. */}
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
          Two stacked drives, and no rows and no text: what arrives here is ciphertext. That it
          also keeps the escrowed code that opens it is `data-holders.tsx`'s to draw. */}
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
