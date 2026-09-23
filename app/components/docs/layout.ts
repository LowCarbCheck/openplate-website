/**
 * Measurements the three docs columns share.
 *
 * `PAGE_TOP` is written once so the sidebar label, the page's first line and
 * the contents label start at the same height at every breakpoint. Spelled in
 * three files it drifted in collie, 16px apart from `sm` up.
 */
export const PAGE_TOP = 'pt-10 sm:pt-12 lg:pt-16';

/**
 * The scroll-spy band's top edge, in pixels. The site header does not stick, so
 * nothing covers the top of the viewport. A heading jumped to lands at
 * `scroll-mt-20` (80px); 64 keeps it inside the band and the heading above it out.
 */
export const SPY_INSET_PX = 64;

/**
 * A thin scrollbar in the border colour on a transparent track, for the rails
 * and sheets that scroll inside themselves. The native one drew a grey track
 * the full height of the file list, which was the loudest thing in the rail.
 * Firefox and Chromium both read these two properties; Safari keeps its own
 * overlay scrollbar, which already has no track.
 */
export const THIN_SCROLLBAR = '[scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent]';
