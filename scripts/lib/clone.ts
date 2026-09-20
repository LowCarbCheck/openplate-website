import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * A shallow checkout of one ref of one source repository, wherever that ref came from.
 *
 * ── A SHA IS NOT A BRANCH, AND `--branch` WILL NOT TAKE ONE ──
 * The obvious spelling is `git clone --depth 1 --branch <ref>`, and that form accepts a branch or a
 * tag and fails on a commit id. `OPENPLATE_APP_REF` takes any ref a person can name, and the one
 * they name when they are checking a claim is a commit id: re-syncing at the sha the committed
 * `SOURCE.json` already names is the only honest way to ask "does this tree reproduce from the
 * commit it says it came from".
 *
 * Both paths stay depth 1. This wants one commit, not a history.
 */
export function cloneAt(repo: string, ref: string, dir: string): void {
  if (!/^[0-9a-f]{40}$/.test(ref)) {
    execFileSync('git', ['clone', '--depth', '1', '--branch', ref, repo, dir], { stdio: 'inherit' });
    return;
  }
  execFileSync('git', ['init', '--quiet', dir], { stdio: 'inherit' });
  execFileSync('git', ['remote', 'add', 'origin', repo], { cwd: dir, stdio: 'inherit' });
  execFileSync('git', ['fetch', '--depth', '1', '--quiet', 'origin', ref], {
    cwd: dir,
    stdio: 'inherit',
  });
  execFileSync('git', ['checkout', '--quiet', 'FETCH_HEAD'], { cwd: dir, stdio: 'inherit' });
}

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' });
}

/**
 * The files a release may be quoted PAST, because changing one of them cannot change the program.
 *
 * `docs/` is where every published guide lives in all three repositories, `CHANGELOG.md` is what
 * the release notes pages are parsed out of, and `README.md` is both the manifest of what to
 * publish and the lead the front page quotes. Those four surfaces are the whole of what this site
 * reads out of a source repository.
 */
const PROSE = new Set(['README.md', 'CHANGELOG.md']);
const PROSE_DIR = 'docs/';

/**
 * Is every one of these paths documentation, so that this commit changed no program?
 *
 * THE WHOLE SAFETY ARGUMENT SITS ON THIS FUNCTION, which is why it is pure and separately tested.
 * It is deliberately the pessimistic direction: an unrecognised path means the tag, and the tag is
 * what shipped before any of this existed. The worst a mistake here can do is send a documentation
 * fix back to waiting for a release; the worst the opposite mistake does is publish a page
 * describing a program nobody can run.
 *
 * ── ASKED OF ONE COMMIT, NOT OF A WHOLE RANGE ──
 * This used to be asked once, of every path that differed between a tag and the branch, and the
 * answer gated the whole repository. ADR-0008 says why that could not stay. It is now asked of one
 * commit's paths at a time, and it decides one file at a time; the predicate itself is unchanged,
 * because what counts as documentation never depended on how the question was scoped.
 *
 * An EMPTY list is not documentation. A commit that changed nothing this walk can see is a merge
 * commit or an empty commit, and neither is evidence that a file is safe to quote early.
 *
 * `startsWith('docs/')` and never `includes('docs/')`: `app/docs/thing.ts` is application code that
 * happens to live in a directory with that name, and the sync never reads it.
 */
export function documentationOnly(paths: string[]): boolean {
  if (paths.length === 0) return false;
  return paths.every((path) => PROSE.has(path) || path.startsWith(PROSE_DIR));
}

/** Which documentation files of a source repository may be read from its branch instead of its tag. */
export interface DocumentationAhead {
  /** The branch tip every answer below was read at. */
  tip: string;
  /** How many paths differ between the tag and the branch at all, documentation or not. */
  changed: number;
  /** Documentation files to read from the branch instead of from the tag, sorted. */
  take: string[];
  /** Documentation files the branch has DELETED, to remove from the tag's tree, sorted. */
  drop: string[];
  /**
   * The newest commit on the branch that touched one of `take` or `drop`, or `null` when there are
   * none.
   *
   * THE FILES' SHA, AND DELIBERATELY NOT THE TIP. Every file in those two lists was last touched at
   * or before this commit, so its blob here is its blob at the tip, and tag plus this commit plus
   * the two lists rebuild the quoted tree byte for byte. The tip would rebuild the same tree and
   * would also move on every unrelated code push upstream, which would write a new `SOURCE.json`
   * for a quote that did not change and fail this repository's push gate on a clean tree.
   */
  commit: string | null;
  /** Documentation files that differ but stay at the tag, because a commit changed them beside code. */
  heldBack: string[];
}

/**
 * The record separator `%x00` writes into the log, which is the one byte a path cannot contain.
 *
 * It is a FORMAT and not an argument: an argv string is itself NUL-terminated, so the four
 * characters `%x00` go to git and git writes the byte this splits on.
 */
const NUL = '\u0000';
const LOG_FORMAT = '--format=%x00%H';
const LOG_ARGS = ['--no-merges', '--no-renames', '--name-only'];

interface Commit {
  sha: string;
  paths: string[];
}

/** `%x00<sha>` then one path per line, per commit, newest first. */
function walk(log: string): Commit[] {
  return log.split(NUL).flatMap((record) => {
    const lines = record.split('\n').filter((line) => line !== '');
    const sha = lines.shift();
    return sha === undefined ? [] : [{ sha, paths: lines }];
  });
}

/** A `-z` field that must be there, spelled so a malformed pair is a message and not a crash. */
function required(field: string | undefined): string {
  if (field === undefined) throw new Error('git diff -z wrote an odd number of fields.');
  return field;
}

/**
 * Decide, per documentation file, whether the branch's copy or the tag's copy is the released one.
 *
 * ── WHY THIS IS PER FILE AND NOT PER RANGE ──
 * The site quotes each source at its highest release tag, because documentation on the default
 * branch can describe code that is not released yet, and publishing that makes the site lie. The
 * first way out asked one question of the whole range: if NOTHING outside `docs/`, `README.md` and
 * `CHANGELOG.md` differed between the tag and the branch, the branch's code was the released code
 * and the whole branch was quoted. It gave the right answer and the wrong granularity. One code
 * change anywhere in the range sent every page back to the tag, including pages whose own file had
 * not moved, so a documentation fix could go live and then be reverted by somebody else's unrelated
 * push. ADR-0008 records the incidents and the decision.
 *
 * ── THE CRITERION, EXACTLY ──
 * A documentation file F is read from the branch when BOTH hold:
 *   * F differs between the tag and the branch, and
 *   * every commit in `tag..branch` that touches F touches documentation paths and nothing else.
 * A file whose last change rode in beside a code change belongs to that code's release and waits
 * for its tag. A file only ever touched by documentation-only commits is a documentation fix, and
 * the code around it is irrelevant to it.
 *
 * ── NON-MERGE COMMITS, AND THE ONE THING THAT HIDES FROM THAT ──
 * The walk is `git log --no-merges`, because a merge commit's contents are its parents' commits and
 * those are all inside the range already. The gap is an evil merge, a merge that edits a file while
 * resolving it. Such an edit belongs to no non-merge commit, so it cannot mark a file, but it also
 * cannot ADD a file to the two lists: a file the walk never sees is never taken. The failure mode
 * is therefore the pessimistic one, a file left at the tag.
 *
 * ── BLOBLESS, AND NOT A DEEPER SHALLOW CLONE ──
 * `cloneAt` clones at depth 1 because the sync clones three repositories on every run and on every
 * CI run, and the depth is why that is fast. A separate `--filter=blob:none --no-checkout` clone
 * fetches commits and trees and no file contents, which is exactly enough for `--name-only` and for
 * `--name-status`: a name lives in a tree, not in a blob. The directory is thrown away here rather
 * than handed back, because nothing else has any use for a tree with no files in it.
 *
 * `tag` and `branch` are an options object and not two strings in a row: they are the same type,
 * and a comparison run backwards is a silent wrong answer rather than an error.
 */
export function documentationAhead(options: { repo: string; tag: string; branch: string }): DocumentationAhead {
  const dir = mkdtempSync(join(tmpdir(), 'openplate-docs-diff-'));
  try {
    execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', '--quiet', options.repo, dir], {
      stdio: 'inherit',
    });
    const branch = `origin/${options.branch}`;
    const tip = git(['rev-parse', branch], dir).trim();
    const range = `${options.tag}..${branch}`;

    // `-z` so a path with a space in it arrives whole rather than quoted, and `--no-renames` so a
    // moved file reads as one deletion and one addition instead of a third field this has to parse.
    const status = new Map<string, string>();
    const fields = git(['diff', '--no-renames', '-z', '--name-status', options.tag, branch], dir).split(NUL);
    for (let at = 0; at + 1 < fields.length; at += 2) {
      status.set(required(fields[at + 1]), required(fields[at]));
    }

    const commits = walk(git(['-c', 'core.quotePath=false', 'log', LOG_FORMAT, ...LOG_ARGS, range], dir));
    const candidates = [...status.keys()].filter((path) => documentationOnly([path])).toSorted();
    const take: string[] = [];
    const drop: string[] = [];
    const heldBack: string[] = [];
    for (const path of candidates) {
      const touching = commits.filter((commit) => commit.paths.includes(path));
      if (touching.length === 0 || !touching.every((commit) => documentationOnly(commit.paths))) {
        heldBack.push(path);
        continue;
      }
      if (status.get(path) === 'D') drop.push(path);
      else take.push(path);
    }

    const quoted = new Set([...take, ...drop]);
    // `git log` is newest first, so the first commit touching one of these files IS the newest one.
    const commit = commits.find((entry) => entry.paths.some((path) => quoted.has(path)))?.sha ?? null;
    return { tip, changed: status.size, take, drop, commit, heldBack };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Fetch a branch into a checkout made at a tag, and say which commit arrived.
 *
 * Depth 1, like everything else here: the overlay reads files out of one commit and never walks
 * back from it. The caller compares the answer with the tip `documentationAhead` decided against,
 * because between the two calls somebody upstream can push, and a list of files chosen against one
 * commit applied to another is a tree nothing recorded.
 */
export function fetchBranch(dir: string, branch: string): string {
  execFileSync('git', ['fetch', '--depth', '1', '--quiet', 'origin', branch], { cwd: dir, stdio: 'inherit' });
  return git(['rev-parse', 'FETCH_HEAD'], dir).trim();
}

/**
 * Overlay one commit's copy of these files onto a checkout, and delete the ones that commit dropped.
 *
 * ── A TREE BUILT FROM OBJECTS, NEVER BY MOVING A BRANCH ──
 * `git checkout <sha> -- <path>` reads a blob and writes a file. It moves no ref, so the checkout is
 * still the tag's tree with named files replaced, which is exactly what the quote claims it is.
 */
export function takeFrom(options: { dir: string; commit: string; take: string[]; drop: string[] }): void {
  if (options.take.length > 0) {
    execFileSync('git', ['checkout', '--quiet', options.commit, '--', ...options.take], {
      cwd: options.dir,
      stdio: 'inherit',
    });
  }
  for (const path of options.drop) rmSync(join(options.dir, path), { force: true });
}
