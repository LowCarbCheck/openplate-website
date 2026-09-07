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

/**
 * Every path that differs between two refs of a repository nobody has checked out.
 *
 * ── WHY THIS EXISTS AT ALL ──
 * The site quotes each source at its highest release tag, because documentation on the default
 * branch can describe code that is not released yet, and publishing that makes the site lie. The
 * price was that a typo fix in `docs/` could not reach a reader without cutting a version whose
 * only content was the typo. The way out is to ask what actually moved: if the ONLY difference
 * between the tag and the branch is documentation, the code tree on the branch IS the released
 * code, so the words on the branch cannot be describing anything unreleased. `documentationOnly`
 * below answers that question and this function gets it the facts.
 *
 * ── BLOBLESS, AND NOT A DEEPER SHALLOW CLONE ──
 * `cloneAt` clones at depth 1 because the sync clones three repositories on every run and on every
 * CI run, and the depth is why that is fast. Deepening it to reach a tag's history would slow the
 * common path down to pay for a question the common path does not ask. A separate
 * `--filter=blob:none --no-checkout` clone fetches commits and trees and no file contents, which is
 * exactly enough for `--name-only`: a name lives in a tree, not in a blob. The directory is thrown
 * away here rather than handed back, because nothing else has any use for a tree with no files in
 * it.
 *
 * `from` and `to` are an options object and not two strings in a row: they are the same type, and
 * a diff run backwards is a silent wrong answer rather than an error.
 */
export function changedPaths(options: { repo: string; from: string; to: string }): string[] {
  const dir = mkdtempSync(join(tmpdir(), 'openplate-docs-diff-'));
  try {
    execFileSync('git', ['clone', '--filter=blob:none', '--no-checkout', '--quiet', options.repo, dir], {
      stdio: 'inherit',
    });
    const out = execFileSync('git', ['diff', '--name-only', options.from, options.to], {
      cwd: dir,
      encoding: 'utf8',
    });
    return out.split('\n').filter((line) => line !== '');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
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
 * Is every one of these paths documentation, so that the branch's code is the released code?
 *
 * THE WHOLE SAFETY ARGUMENT SITS ON THIS FUNCTION, which is why it is pure and separately tested.
 * It is deliberately the pessimistic direction: an unrecognised path means the tag, and the tag is
 * what shipped before any of this existed. The worst a mistake here can do is send a documentation
 * fix back to waiting for a release; the worst the opposite mistake does is publish a page
 * describing a program nobody can run.
 *
 * An EMPTY list is not documentation-only. Two identical trees are the same tree, and the caller
 * quotes the tag for it, because a tag is a better thing to print next to a page than a branch
 * name that happens to be sitting on it today.
 *
 * `startsWith('docs/')` and never `includes('docs/')`: `app/docs/thing.ts` is application code that
 * happens to live in a directory with that name, and the sync never reads it.
 */
export function documentationOnly(paths: string[]): boolean {
  if (paths.length === 0) return false;
  return paths.every((path) => PROSE.has(path) || path.startsWith(PROSE_DIR));
}
