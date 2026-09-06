/**
 * Modules Vite makes up, which have no file on disk for TypeScript to read.
 *
 * `virtual:theme-colors` is built by the plugin in `vite.config.ts` out of the two `:root` blocks
 * in `app/app.css`. It exists so the `theme-color` meta tags, which need a literal colour and
 * cannot be given `var(--background)`, are not a second hand-written copy of the palette. Change a
 * token in the stylesheet and the browser chrome follows on the next build.
 */
declare module 'virtual:theme-colors' {
  /** The page background of each appearance, as hex, which is what a browser paints its chrome. */
  export const THEME_COLOR: { light: string; dark: string };
}
