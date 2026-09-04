import { execFileSync } from 'node:child_process';

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
