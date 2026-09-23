/**
 * The one frame every page's chrome sits in: 72rem, centred, a 20 pixel gutter.
 *
 * ── ONE WIDTH, SO NOTHING JUMPS BETWEEN PAGES ──
 * The documentation used to draw its own frame, 88rem with a 24 pixel gutter, and the header
 * followed it. Going from the front page to /docs moved the wordmark and every nav link sideways
 * by the difference, which a reader sees as the page shifting under them. Now the header, the
 * footer, the marketing pages and the docs grid all take this string, and
 * `tests/unit/page-frame-width.test.ts` fails if any page width gives the chrome another one.
 *
 * `max-w-6xl` is also what a marketing page's content is. A reading page's text is narrower inside
 * it, never wider.
 */
export const FRAME = 'mx-auto w-full max-w-6xl px-5';
