/**
 * sync-shots, copy openplate's product screenshots out of the application repository into `public/`.
 *
 * A DEVELOPER TOOL, run by hand, whose output is COMMITTED, for the reasons `sync-docs.ts` and
 * `sync-icons.ts` both give at length: the site's image has no network, and a build that reaches
 * GitHub for a picture can fail for a reason that has nothing to do with the site.
 *
 *   pnpm sync:shots                                   # the app repository at its highest tag
 *   OPENPLATE_APP_REPO=../openplate pnpm sync:shots   # a checkout you already have
 *   OPENPLATE_APP_REF=v0.10.3 pnpm sync:shots         # any ref
 *
 * ── THE PICTURES BELONG TO THE APPLICATION, AND SO DOES THE CAMERA ──
 * These are captured by `openplate/scripts/capture-landing.ts`, which boots the app with seeded
 * example data, sets the interface language and takes every screen the manifest names. That script
 * lives upstream because the app and its seed data do, and because a second set of pictures made by
 * hand is two sets that rot on the next redesign. This end of the pipe only copies, at a ref, and
 * refuses to copy half a set.
 *
 * ── WHAT IT REFUSES ──
 * `app/lib/shots.ts` IS the manifest, and it is the same module the components read, so a picture
 * this site draws and a picture this script demands cannot come apart. A named file missing
 * upstream fails the run naming EVERY missing file at once, because the person repairing the
 * pairing between the two repositories wants the list and not the first line of it. Anything else
 * under `public/shots/` is pruned LAST, after every copy has succeeded, so a failed sync leaves the
 * site serving the pictures it was serving before.
 *
 * ── THE SYNC SCREEN IS UPSTREAM AND IS NOT COPIED, ON PURPOSE ──
 * `openplate/public/landing/<locale>/sync-mobile-*.webp` exists and this script walks past it.
 * `/settings/sync` has redirected to `/settings/account` since M192, so signed out that capture is
 * a card that says you are signed out: honest, and about nothing. The reasoning is written where
 * the decision lives, in `app/lib/shots.ts`. If a future capture of that screen ever shows sync,
 * adding it to `SHOT_VIEWS` starts copying it here with no change to this file.
 *
 * ── WHY THIS DOES NOT IMPORT `sync-icons.ts` ──
 * The same answer that file gives about `sync-docs.ts`: those scripts are programs, so importing
 * one runs it. The shared part is thirty lines of git plumbing and that is the smaller cost.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { cloneAt } from './lib/clone';
import { listFiles } from './lib/sync-images';
import { shotManifest } from '../app/lib/shots';

const REPO = 'https://github.com/LowCarbCheck/openplate.git';
const ENV_REPO = 'OPENPLATE_APP_REPO';
const ENV_REF = 'OPENPLATE_APP_REF';

/**
 * Where the captures live upstream, and where they land here.
 *
 * The two trees are named differently on purpose. Upstream they are `public/landing/`, because
 * upstream they are the assets of one page, the app's own landing. Here they are `public/shots/`,
 * because here they are the product's photographs and four pages use them. A path that means the
 * same thing in both repositories would suggest the two directories have to stay in step, and they
 * do not: the manifest is what has to.
 */
const UPSTREAM_DIR = 'public/landing';
const SHOTS_DIR = resolve('public/shots');

function fail(message: string): never {
  console.error(`sync-shots: ${message}`);
  process.exit(1);
}

function git(args: string[], cwd?: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** `v1.2.3` as three numbers, or `null` for anything that is not a plain release tag. */
function version(tag: string): [number, number, number] | null {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * The highest semver tag the repository has, by sorting the tags rather than asking which release
 * was published most recently. A hotfix on an old line is published after a new major and is not
 * the newest version, which is the trap `sync-docs.ts` documents at length.
 */
function highestTag(repo: string): string | null {
  const tags = git(['ls-remote', '--tags', '--refs', repo])
    .split('\n')
    .flatMap((line) => {
      const tag = /refs\/tags\/(?<tag>\S+)$/.exec(line)?.groups?.['tag'];
      return tag !== undefined && version(tag) !== null ? [tag] : [];
    })
    .toSorted((a, b) => {
      const [x, y] = [version(a) ?? [0, 0, 0], version(b) ?? [0, 0, 0]];
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
  return tags[0] ?? null;
}

interface Tree {
  dir: string;
  /** Whether this directory is ours to delete afterwards. */
  scratch: boolean;
  /** What the run publishes from, for the log line. */
  ref: string;
}

/**
 * The application's tree, at the ref this run copies from.
 *
 * A local checkout named by `OPENPLATE_APP_REPO` with no ref pinned is READ WHERE IT STANDS, the
 * same rule the other two syncs follow and for the same reason: the override exists for the case
 * where the picture you want is on the branch in front of you and in no tag yet. That is the normal
 * case for a fresh capture, because the capture and the page that shows it are usually one change.
 */
function appTree(): Tree {
  const repo = process.env[ENV_REPO] ?? REPO;
  const pinned = process.env[ENV_REF] ?? '';
  const local = existsSync(join(repo, '.git'));

  if (local && pinned === '') {
    const dir = resolve(repo);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
    console.log(`sync-shots: reading the checkout at ${dir} (${branch})`);
    return { dir, scratch: false, ref: branch };
  }

  const ref = pinned === '' ? (highestTag(repo) ?? fail(`${repo} has no vX.Y.Z tag to copy from.`)) : pinned;
  const dir = mkdtempSync(join(tmpdir(), 'openplate-shots-'));
  console.log(`sync-shots: cloning ${repo} at ${ref}`);
  cloneAt(repo, ref, dir);
  return { dir, scratch: true, ref };
}

/**
 * Everything under `public/shots/` that the manifest no longer names, gone.
 *
 * Runs LAST, after every copy has succeeded. A half-pruned `public/shots/` is a landing page with
 * holes in it, which is worse than one showing last week's captures.
 */
function prune(kept: Set<string>): string[] {
  const removed: string[] = [];
  for (const relative of listFiles(SHOTS_DIR)) {
    const file = join(SHOTS_DIR, relative);
    if (kept.has(file)) continue;
    rmSync(file, { force: true });
    removed.push(relative);
  }
  return removed;
}

/** `shots/de/diary-mobile-light.webp` as the upstream `public/landing/de/diary-mobile-light.webp`. */
function upstreamPath(target: string): string {
  const locale = basename(dirname(target));
  return `${UPSTREAM_DIR}/${locale}/${basename(target)}`;
}

const manifest = shotManifest();
const tree = appTree();
try {
  // Read the WHOLE manifest before writing any of it, so a run that is going to fail fails before
  // it has replaced a single file, and fails with the full list.
  const missing = manifest.filter((target) => !existsSync(join(tree.dir, upstreamPath(target))));
  if (missing.length > 0) {
    fail(
      `the application at ${tree.ref} does not have ${missing.map(upstreamPath).join(', ')}. ` +
        `Either the capture script has not been run for that language, or this ref predates it.`,
    );
  }

  const kept = new Set<string>();
  for (const target of manifest) {
    const source = join(tree.dir, upstreamPath(target));
    if (!statSync(source).isFile()) fail(`${upstreamPath(target)} is not a file.`);
    const file = resolve('public', target);
    mkdirSync(dirname(file), { recursive: true });
    copyFileSync(source, file);
    kept.add(file);
  }

  const removed = prune(kept);
  console.log(`sync-shots: ${manifest.length} screenshots at ${tree.ref}`);
  if (removed.length > 0) console.log(`sync-shots: pruned ${removed.join(', ')}`);
} finally {
  if (tree.scratch) rmSync(tree.dir, { recursive: true, force: true });
}
