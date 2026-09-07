/**
 * sync-icons, copy openplate's mark out of the brand repository into `public/`.
 *
 * A DEVELOPER TOOL, run by hand, whose output is COMMITTED, for the same reasons `sync-docs.ts`
 * gives at length: the site's image has no network, and a build that reaches GitHub for a picture
 * can fail for a reason that has nothing to do with the site.
 *
 *   pnpm sync:icons                                         # the brand repository at its highest tag
 *   OPENPLATE_BRAND_REPO=../openplate-brand pnpm sync:icons  # a checkout you already have
 *   OPENPLATE_BRAND_REF=v0.1.0 pnpm sync:icons               # any ref
 *
 * ── THE MARK BELONGS TO `openplate-brand`, AND THIS SITE IS ONE OF ITS CONSUMERS ──
 * openplate's icon is drawn once, in `openplate-brand/masters/`, and cut into that repository's
 * `assets/` by its own script. The application and this site both install from there, on equal
 * terms: neither of them owns the mark, and neither is the other's source. A hand copy taken once
 * is a second original: it does not move when the mark is redrawn, and nothing tells anybody.
 * Pinning the brand to a ref and copying it by script means a redraw reaches the site on the next
 * sync and shows up in review as bytes that changed, which is exactly how the documentation and the
 * diagrams already work.
 *
 * ── WHY THE SHA256 OF EVERY FILE IS CHECKED ──
 * `assets/MANIFEST.json` publishes a hash per asset precisely so a consumer can prove WHAT it
 * received, not merely that a file of the right name was there. A tree whose assets were hand
 * edited, a truncated download and a half-written copy all produce a picture that opens, so nothing
 * downstream of here would ever complain. The check runs twice for that reason: on the source
 * before anything is written, so a bad tree never reaches `public/`, and on the copy afterwards, so
 * a write that did not land in full is reported rather than committed.
 *
 * ── WHY THIS DOES NOT IMPORT `sync-docs.ts` ──
 * `worktree()` and `highestTag()` there do the same job as `brandTree()` and `highestTag()` here,
 * and they are not exported, because that file is a program: importing it runs it. Three
 * repositories' worth of documentation is not what a person asking for an icon wants to wait for.
 * The duplicated part is thirty lines of git plumbing and it is the smaller cost.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

import { cloneAt } from './lib/clone';

/**
 * SSH, and not the `https://` form the documentation sync uses, because `openplate-brand` is a
 * PRIVATE repository: an anonymous clone of it fails, and a `git` that has the key already is the
 * only thing that can read it.
 */
const REPO = 'git@github.com:LowCarbCheck/openplate-brand.git';
const ENV_REPO = 'OPENPLATE_BRAND_REPO';
const ENV_REF = 'OPENPLATE_BRAND_REF';

/** The brand repository's installable output, and the file that says what it should hash to. */
const MANIFEST = 'assets/MANIFEST.json';

/**
 * Every icon this site serves, and the whole list of it. THIS is the manifest the pruning below
 * enforces, so a file that is not named here does not reach `public/` and does not survive there.
 *
 * ── THE TWO MASKABLE ICONS ARE DELIBERATELY LEFT IN THE BRAND REPOSITORY ──
 * `assets/` also carries `icon-maskable-192.png` and `icon-maskable-512.png`, and they are not on
 * this list. A maskable icon has exactly one consumer, a web app manifest, and this site
 * deliberately ships none: `beta.openplate.de` is the installable application. Copying them anyway
 * would put two pictures in the tree that no document ever names, which is how a directory starts
 * collecting things nobody can delete because nobody can prove they are unused.
 */
interface Icon {
  /** Where the file lives in the brand repository. Its name there is its key in `MANIFEST.json`. */
  from: string;
  /** Where it lands here, relative to this repository's root. */
  to: string;
}

const ICONS: Icon[] = [
  // The tab, and the one file a browser asks for by convention whether it is declared or not.
  { from: 'assets/favicon.ico', to: 'public/favicon.ico' },
  // iOS uses this one for a home screen bookmark. 180 square, no transparency, no rounding.
  { from: 'assets/apple-touch-icon.png', to: 'public/icons/apple-touch-icon.png' },
  { from: 'assets/icon-192.png', to: 'public/icons/icon-192.png' },
  { from: 'assets/icon-512.png', to: 'public/icons/icon-512.png' },
];

/** The directory the pruning owns. `public/favicon.ico` sits outside it and is only ever replaced. */
const ICONS_DIR = resolve('public/icons');

/** The part of `MANIFEST.json` this script reads. It publishes masters and a teal as well. */
interface BrandManifest {
  assets: Record<string, { sha256: string }>;
}

/** One file whose bytes are about to be weighed against what the brand repository published. */
interface Weighed {
  /** The asset's name in `assets/`, which is the key `MANIFEST.json` records it under. */
  asset: string;
  /** The file to hash, wherever it currently sits. */
  file: string;
}

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
 * The brand repository's tree, at the ref this run copies from.
 *
 * A local checkout named by `OPENPLATE_BRAND_REPO` with no ref pinned is READ WHERE IT STANDS, the
 * same rule `sync-docs.ts` follows and for the same reason: the override exists for the case where
 * the file you want to copy is on the branch in front of you and in no tag yet.
 */
function brandTree(): Tree {
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

/** What the brand repository says each of its assets weighs, by the name it publishes it under. */
function published(file: string): Map<string, string> {
  // SAFETY: `MANIFEST.json` is generated beside the assets by the brand repository's `ship.ts`, and
  // a tree that has the assets has this file in the shape it writes. A file that is not that shape
  // yields no hash for an asset, and the comparison below then reports that asset by name.
  const manifest = JSON.parse(readFileSync(file, 'utf8')) as BrandManifest;
  return new Map(Object.entries(manifest.assets).map(([name, asset]) => [name, asset.sha256]));
}

function digest(file: string): string {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

/** The names of the files whose bytes are not what `MANIFEST.json` says they should be. */
function mismatched(files: Weighed[], expected: Map<string, string>): string[] {
  return files.flatMap((weighed) => (digest(weighed.file) === expected.get(weighed.asset) ? [] : [weighed.asset]));
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

const tree = brandTree();
try {
  // Read the whole manifest before writing any of it. A missing file is a fault in the pairing
  // between the two repositories, and the person fixing it wants the list, not the first one.
  const missing = [MANIFEST, ...ICONS.map((icon) => icon.from)].filter((path) => !existsSync(join(tree.dir, path)));
  if (missing.length > 0) {
    fail(
      `the brand repository at ${tree.ref} does not have ${missing.join(', ')}. ` +
        `Either the mark moved upstream, or this ref predates it.`,
    );
  }

  const expected = published(join(tree.dir, MANIFEST));
  const sources: Weighed[] = ICONS.map((icon) => ({
    asset: basename(icon.from),
    file: join(tree.dir, icon.from),
  }));

  // Weighed BEFORE the first write, so a tree whose assets do not match its own manifest never
  // reaches `public/` at all and this run changes nothing.
  const wrongUpstream = mismatched(sources, expected);
  if (wrongUpstream.length > 0) {
    fail(
      `${wrongUpstream.join(', ')} in the brand repository at ${tree.ref} ` +
        `${wrongUpstream.length === 1 ? 'does' : 'do'} not match the sha256 in ${MANIFEST}. ` +
        `Nothing was copied. That tree was hand edited, or it is damaged: run \`pnpm check\` there.`,
    );
  }

  const kept = new Set<string>();
  const copies: Weighed[] = [];
  for (const icon of ICONS) {
    const source = join(tree.dir, icon.from);
    if (!statSync(source).isFile()) fail(`${icon.from} is not a file.`);
    const target = resolve(icon.to);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    kept.add(target);
    copies.push({ asset: basename(icon.from), file: target });
  }

  // And weighed again where they landed, which is the only thing that can catch a copy that did
  // not arrive whole.
  const wrongHere = mismatched(copies, expected);
  if (wrongHere.length > 0) {
    fail(`${wrongHere.join(', ')} did not copy whole. Check \`public/\` before you commit it.`);
  }

  const removed = prune(kept);
  const names = ICONS.map((icon) => basename(icon.to)).join(', ');
  console.log(`sync-icons: ${ICONS.length} icons at ${tree.ref}, sha256 verified (${names})`);
  if (removed.length > 0) console.log(`sync-icons: pruned ${removed.join(', ')}`);
} finally {
  if (tree.scratch) rmSync(tree.dir, { recursive: true, force: true });
}
