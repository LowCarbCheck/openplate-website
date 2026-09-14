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
