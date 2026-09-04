import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every file under `dir`, as forward-slash paths relative to it.
 *
 * The same shape a doc's markdown reference is in — `images/updates/x.png` — so a caller can check
 * "does the file this doc points at actually exist" with a plain `Set.has`, no path math twice.
 */
export function listFiles(dir: string, prefix = ''): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...listFiles(join(dir, entry.name), rel));
    else out.push(rel);
  }
  return out.toSorted();
}

/**
 * Replace `outDir` with a copy of `srcDir`, whole.
 *
 * WIPED FIRST, not merged. `sync-docs.ts` can check every `docs/*.md` file against the README's own
 * table and refuse to run if the two disagree — there is no equivalent table for `docs/images/`, so
 * a full recopy is the only way an image removed upstream does not linger here as a stale committed
 * blob nobody notices.
 *
 * `srcDir` missing is not an error. A checkout with no `docs/images/` copies zero files
 * and leaves `outDir` gone, cleanly — the same state a doc with no screenshots should produce.
 *
 * Returns the files that ended up in `outDir`, relative to it, so the caller can log a count and
 * check every doc's image links against something real.
 */
export function syncImages(srcDir: string, outDir: string): string[] {
  rmSync(outDir, { recursive: true, force: true });
  if (!existsSync(srcDir)) return [];
  mkdirSync(outDir, { recursive: true });
  cpSync(srcDir, outDir, { recursive: true });
  return listFiles(outDir);
}
