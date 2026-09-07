/**
 * Which ref of a source repository the site quotes.
 *
 * The site quotes each source at its highest release tag, because the default branch can document
 * code that is not released and publishing that makes the site lie. The exception, added because a
 * typo fix in `docs/` should not need a version bump, is that the branch is quoted when the ONLY
 * difference between the two trees is documentation. `documentationOnly` is where the whole safety
 * argument of that exception sits, so it is a pure function over a list of paths and it is tested
 * hardest here: a path it wrongly calls documentation publishes a page about a program nobody can
 * run.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';

import { changedPaths, documentationOnly } from '../../scripts/lib/clone';

describe('documentationOnly', () => {
  it('takes a guide under docs/', () => {
    assert.equal(documentationOnly(['docs/architecture.md']), true);
  });

  it('takes the README, which is the manifest and the lead this site quotes', () => {
    assert.equal(documentationOnly(['README.md']), true);
  });

  it('takes the CHANGELOG, which is the release notes page', () => {
    assert.equal(documentationOnly(['CHANGELOG.md']), true);
  });

  it('takes several documents at once', () => {
    assert.equal(documentationOnly(['README.md', 'CHANGELOG.md', 'docs/protocol.md', 'docs/images/a.png']), true);
  });

  it('refuses a manifest change, because a dependency is code', () => {
    assert.equal(documentationOnly(['package.json']), false);
  });

  it('refuses a source file', () => {
    assert.equal(documentationOnly(['app/lib/brand.ts']), false);
  });

  it('refuses documentation and code together, which is the ordinary release', () => {
    assert.equal(documentationOnly(['docs/architecture.md', 'app/lib/brand.ts']), false);
  });

  it('refuses an empty diff, so two identical trees are quoted at the tag', () => {
    assert.equal(documentationOnly([]), false);
  });

  /**
   * THE ONE A SLOPPY `includes('docs/')` GETS WRONG. `app/docs/thing.ts` is application code in a
   * directory that happens to be called docs, the sync never reads it, and calling it documentation
   * would publish a branch whose program has changed.
   */
  it('refuses a path that merely contains docs/ deeper in it', () => {
    assert.equal(documentationOnly(['app/docs/thing.ts']), false);
  });

  it('refuses a file called docs with no slash after it', () => {
    assert.equal(documentationOnly(['docs']), false);
  });

  it('refuses a README that is not the repository root one', () => {
    assert.equal(documentationOnly(['app/README.md']), false);
  });
});

const scratches: string[] = [];
after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
    },
  });
}

/** A repository on disk with a tagged commit and then one more commit on `main`. */
function repoWithTagAndBranch(later: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'openplate-docs-test-ref-'));
  scratches.push(dir);
  git(['init', '--quiet', '--initial-branch=main', '.'], dir);
  write(dir, 'README.md', '# A repository\n');
  write(dir, 'src/index.ts', 'export const one = 1;\n');
  git(['add', '-A'], dir);
  git(['commit', '--quiet', '-m', 'first'], dir);
  git(['tag', 'v1.0.0'], dir);
  for (const [path, body] of Object.entries(later)) write(dir, path, body);
  git(['add', '-A'], dir);
  git(['commit', '--quiet', '-m', 'second'], dir);
  return dir;
}

function write(root: string, path: string, body: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

/**
 * `changedPaths` against real git, because the reason it exists is that `cloneAt` is depth 1 and
 * has no history to diff. A test of the classifier alone would pass with a clone that fetched
 * nothing. Local paths only, so this needs no network.
 */
describe('changedPaths', () => {
  it('names the net difference between a tag and the default branch', () => {
    const repo = repoWithTagAndBranch({ 'docs/guide.md': '# Guide\n' });
    assert.deepEqual(changedPaths({ repo, from: 'v1.0.0', to: 'origin/main' }), ['docs/guide.md']);
  });

  it('says nothing changed when the branch sits on the tag', () => {
    const repo = repoWithTagAndBranch({ 'docs/guide.md': '# Guide\n' });
    git(['tag', 'v1.1.0'], repo);
    assert.deepEqual(changedPaths({ repo, from: 'v1.1.0', to: 'origin/main' }), []);
  });

  /**
   * A commit that changed code and a later one that put it back nets to nothing, and the invariant
   * this feeds is about the two trees rather than about how the branch got from one to the other.
   */
  it('reads the trees and not the history, so a reverted change does not count', () => {
    const repo = repoWithTagAndBranch({ 'src/index.ts': 'export const one = 2;\n' });
    write(repo, 'src/index.ts', 'export const one = 1;\n');
    write(repo, 'docs/guide.md', '# Guide\n');
    git(['add', '-A'], repo);
    git(['commit', '--quiet', '-m', 'third'], repo);
    assert.deepEqual(changedPaths({ repo, from: 'v1.0.0', to: 'origin/main' }), ['docs/guide.md']);
  });
});
