/**
 * sync-icons, copy openplate's own mark out of the application repository into `public/`.
 *
 * A DEVELOPER TOOL, run by hand, whose output is COMMITTED, for the same reasons `sync-docs.ts`
 * gives at length: the site's image has no network, and a build that reaches GitHub for a picture
 * can fail for a reason that has nothing to do with the site.
 *
 *   pnpm sync:icons                                   # the app repository at its highest tag
 *   OPENPLATE_APP_REPO=../openplate pnpm sync:icons   # a checkout you already have
 *   OPENPLATE_APP_REF=v0.10.3 pnpm sync:icons         # any ref
 *
 * ── THE MARK BELONGS TO THE APPLICATION, SO THIS SITE DOES NOT KEEP ITS OWN COPY ──
 * openplate's icon is drawn once, in `openplate/public/icons/`, beside the manifest of the thing
 * people install. A hand copy taken once is a second original: it does not move when the mark is
 * redrawn, and nothing tells anybody. Pinning it to a ref and copying it by script means a redraw
 * upstream reaches the site on the next sync and shows up in review as bytes that changed, which is
 * exactly how the documentation and the diagrams already work.
 *
 * ── WHY THIS DOES NOT IMPORT `sync-docs.ts` ──
 * `worktree()` and `highestTag()` there do the same job as `appTree()` and `highestTag()` here, and
 * they are not exported, because that file is a program: importing it runs it. Three repositories'
 * worth of documentation is not what a person asking for an icon wants to wait for. The duplicated
 * part is thirty lines of git plumbing and it is the smaller cost.
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { cloneAt } from './lib/clone';

const REPO = 'https://github.com/LowCarbCheck/openplate.git';
const ENV_REPO = 'OPENPLATE_APP_REPO';
const ENV_REF = 'OPENPLATE_APP_REF';

/**
 * Every icon this site serves, and the whole list of it. THIS is the manifest the pruning below
 * enforces, so a file that is not named here does not reach `public/` and does not survive there.
 *
 * ── THE TWO MASKABLE ICONS ARE DELIBERATELY NOT ON THIS LIST ──
 * A maskable icon has exactly one consumer, a web app manifest, and this site deliberately ships
 * none: `beta.openplate.de` is the installable application. Copying them anyway would put two
 * pictures in the tree that no document ever names, which is how a directory starts collecting
 * things nobody can delete because nobody can prove they are unused.
 */
interface Icon {
  /** Where the file lives in the application repository. */
  from: string;
  /** Where it lands here, relative to this repository's root. */
  to: string;
}

const ICONS: Icon[] = [
  // The tab, and the one file a browser asks for by convention whether it is declared or not.
  { from: 'public/favicon.ico', to: 'public/favicon.ico' },
  // iOS uses this one for a home screen bookmark. 180 square, no transparency, no rounding.
  { from: 'public/icons/apple-touch-icon.png', to: 'public/icons/apple-touch-icon.png' },
  { from: 'public/icons/icon-192.png', to: 'public/icons/icon-192.png' },
  { from: 'public/icons/icon-512.png', to: 'public/icons/icon-512.png' },
];

/** The directory the pruning owns. `public/favicon.ico` sits outside it and is only ever replaced. */
const ICONS_DIR = resolve('public/icons');

function fail(message: string): never {
  console.error(`sync-icons: ${message}`);
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
 * same rule `sync-docs.ts` follows and for the same reason: the override exists for the case where
 * the file you want to copy is on the branch in front of you and in no tag yet.
 */
function appTree(): Tree {
  const repo = process.env[ENV_REPO] ?? REPO;
  const pinned = process.env[ENV_REF] ?? '';
  const local = existsSync(join(repo, '.git'));

  if (local && pinned === '') {
    const dir = resolve(repo);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
    console.log(`sync-icons: reading the checkout at ${dir} (${branch})`);
    return { dir, scratch: false, ref: branch };
  }

  const ref = pinned === '' ? (highestTag(repo) ?? fail(`${repo} has no vX.Y.Z tag to copy from.`)) : pinned;
  const dir = mkdtempSync(join(tmpdir(), 'openplate-icons-'));
  console.log(`sync-icons: cloning ${repo} at ${ref}`);
  cloneAt(repo, ref, dir);
  return { dir, scratch: true, ref };
}

/**
 * Everything under `public/icons/` that the manifest above no longer names, gone.
 *
 * Runs LAST, after every copy has succeeded, so a sync that failed on a missing file upstream
 * leaves the icons the site is currently serving exactly where they were. A half-pruned `public/`
 * is a site with no mark, which is worse than a site with a stale one.
 */
function prune(kept: Set<string>): string[] {
  if (!existsSync(ICONS_DIR)) return [];
  const removed: string[] = [];
  for (const entry of readdirSync(ICONS_DIR)) {
    const file = join(ICONS_DIR, entry);
    if (kept.has(file)) continue;
    rmSync(file, { recursive: true, force: true });
    removed.push(entry);
  }
  return removed;
}

const tree = appTree();
try {
  // Read the whole manifest before writing any of it. A missing file is a fault in the pairing
  // between the two repositories, and the person fixing it wants the list, not the first one.
  const missing = ICONS.filter((icon) => !existsSync(join(tree.dir, icon.from)));
  if (missing.length > 0) {
    fail(
      `the application at ${tree.ref} does not have ${missing.map((icon) => icon.from).join(', ')}. ` +
        `Either the mark moved upstream, or this ref predates it.`,
    );
  }

  const kept = new Set<string>();
  for (const icon of ICONS) {
    const source = join(tree.dir, icon.from);
    if (!statSync(source).isFile()) fail(`${icon.from} is not a file.`);
    const target = resolve(icon.to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    kept.add(target);
  }

  const removed = prune(kept);
  const names = ICONS.map((icon) => basename(icon.to)).join(', ');
  console.log(`sync-icons: ${ICONS.length} icons at ${tree.ref} (${names})`);
  if (removed.length > 0) console.log(`sync-icons: pruned ${removed.join(', ')}`);
} finally {
  if (tree.scratch) rmSync(tree.dir, { recursive: true, force: true });
}
