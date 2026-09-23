/**
 * Lets the unit tier import a module that imports a Vite virtual module.
 *
 * `virtual:theme-colors` is made by the plugin in `vite.config.ts` and exists only inside a Vite
 * build, so plain Node refuses the `virtual:` scheme outright. Any module that reaches it
 * (`app/lib/theme.ts`, and so the whole page frame in `app/components/site-layout.tsx`) could not be
 * imported by a test at all. This file is loaded by `pnpm test:unit` with `--import`, before any
 * test module, and answers that one specifier with a fixed stand-in.
 *
 * The colours are placeholders on purpose. No unit test asserts a theme colour through this module:
 * `tests/unit/theme.test.ts` reads the stylesheet itself. A test that needs the real palette must
 * read `app/app.css`, not this.
 */
import { register } from 'node:module';

const STAND_IN = 'export const THEME_COLOR = { light: "#ffffff", dark: "#000000" };';

const HOOKS = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier !== 'virtual:theme-colors') return nextResolve(specifier, context);
  return { url: ${JSON.stringify(`data:text/javascript,${encodeURIComponent(STAND_IN)}`)}, shortCircuit: true };
}
`;

register(`data:text/javascript,${encodeURIComponent(HOOKS)}`);
