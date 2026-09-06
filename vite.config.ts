import { fileURLToPath } from 'node:url';

import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import { type Plugin, defineConfig, loadEnv } from 'vite';

import { readPalettes } from './scripts/lib/mermaid';

const APP_CSS = fileURLToPath(new URL('./app/app.css', import.meta.url));

const THEME_COLORS_ID = 'virtual:theme-colors';
/** Vite's convention for "this id is mine, leave it alone", and it must survive into `load`. */
const THEME_COLORS_RESOLVED = `\0${THEME_COLORS_ID}`;

/**
 * The `theme-color` values, read from the stylesheet instead of written down a second time.
 *
 * A `theme-color` meta tag needs a literal colour: the browser paints its own chrome with it,
 * outside the document, so `hsl(var(--background))` resolves to nothing. That is the one place the
 * palette would have to be repeated by hand, and a repeated colour is a colour that goes stale in
 * silence, because nothing renders wrong, it just renders the old teal.
 *
 * So the same `readPalettes` the diagram renderer uses parses `app/app.css` here, at build time, and
 * the module the document imports is two strings. `addWatchFile` makes an edit to the stylesheet
 * reload the page in dev, which is the behaviour a person editing a token expects.
 */
function themeColors(): Plugin {
  return {
    name: 'openplate-theme-colors',
    resolveId(source) {
      return source === THEME_COLORS_ID ? THEME_COLORS_RESOLVED : null;
    },
    load(id) {
      if (id !== THEME_COLORS_RESOLVED) return null;
      this.addWatchFile(APP_CSS);
      const palettes = readPalettes(APP_CSS);
      const colors = { light: palettes.light['background'], dark: palettes.dark['background'] };
      return `export const THEME_COLOR = ${JSON.stringify(colors)};\n`;
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const hmrPort = env.HMR_PORT ? parseInt(env.HMR_PORT, 10) : 24678;
  const serverPort = env.PORT ? parseInt(env.PORT, 10) : 3000;

  return {
    plugins: [themeColors(), tailwindcss(), reactRouter()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      port: serverPort,
      hmr: { port: hmrPort },
    },
  };
});
