/**
 * The per-file documentation quote, driven against real repositories with a MIXED diff in them.
 *
 * ── WHY REAL GIT AND NOT A FAKE ──
 * The thing under test is a claim about history: "every commit since the tag that touched this file
 * touched documentation and nothing else". A fake that answered questions about commits would be a
 * second implementation of the rule, asserted against itself. Every repository here is built by
 * `git init` in a temporary directory, and the production functions clone it and walk it exactly
 * the way they clone and walk GitHub.
 *
 * ── EVERY CASE CARRIES A CONTROL ──
 * An assertion nobody has watched go red is a decoration. Each `it` that states what the rule does
 * is followed by one that runs the same expectation against a deliberately broken rule, or against
 * a world the rule must answer differently for, and asserts it does NOT hold. The two broken rules
 * are `rangeWide`, which is the all-or-nothing verdict this change replaced, and `everyChangedDoc`,
 * which is the rule you get by forgetting to look at the commits at all.
 *
 * ADR-0008 is the decision these tests pin.
 */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';

import {
  type DocumentationAhead,
  cloneAt,
  documentationAhead,
  documentationOnly,
  fetchBranch,
  takeFrom,
} from '../../scripts/lib/clone';
import {
  SCRIPT,
  TSCONFIG,
  TSX,
  disposeScratches,
  manifestFiles,
  readme,
  repo as inPlaceRepo,
  scratch,
} from './lib/sync-fixtures';

after(disposeScratches);

const TAG = 'v1.0.0';
const BRANCH = 'main';

/** A repository with a release in it, plus the source files that make a mixed commit possible. */
const BASE = {
  'README.md': '# A repository\n',
  'CHANGELOG.md': '# Changelog\n\n## v1.0.0\n\nThe first one.\n',
  'docs/guide.md': '# Guide\n\nAs released.\n',
  'src/index.ts': 'export const one = 1;\n',
  'compose.yml': 'services: {}\n',
};

interface Step {
  message: string;
  write?: Record<string, string>;
  remove?: string[];
}

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

function put(root: string, path: string, body: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

/** `BASE`, committed and tagged, then one commit per step on `main`. */
function history(base: Record<string, string>, steps: Step[]): string {
  const dir = scratch('history');
  for (const [path, body] of Object.entries(base)) put(dir, path, body);
  git(['init', '--quiet', `--initial-branch=${BRANCH}`, '.'], dir);
  git(['add', '-A'], dir);
  git(['commit', '--quiet', '-m', 'the release'], dir);
  git(['tag', TAG], dir);
  for (const step of steps) {
    for (const [path, body] of Object.entries(step.write ?? {})) put(dir, path, body);
    for (const path of step.remove ?? []) rmSync(join(dir, path), { force: true });
    git(['add', '-A'], dir);
    git(['commit', '--quiet', '-m', step.message], dir);
  }
  return dir;
}

function ahead(repo: string): DocumentationAhead {
  return documentationAhead({ repo, tag: TAG, branch: BRANCH });
}

/** The tree the sync would publish: the tag, with the cleared documentation laid over it. */
function hybrid(repo: string): string {
  const answer = ahead(repo);
  const dir = scratch('hybrid');
  cloneAt(repo, TAG, dir);
  if (answer.commit !== null) {
    const fetched = fetchBranch(dir, BRANCH);
    takeFrom({ dir, commit: fetched, take: answer.take, drop: answer.drop });
  }
  return dir;
}

function read(dir: string, path: string): string {
  return readFileSync(join(dir, path), 'utf8');
}

/** Every path that differs between the tag and the branch, read straight out of the repository. */
function changed(repo: string): string[] {
  return git(['diff', '--name-only', TAG, BRANCH], repo)
    .split('\n')
    .filter((line) => line !== '');
}

/**
 * BROKEN ON PURPOSE. The rule this change replaced: one verdict for the whole range, so a single
 * code change anywhere sends every page back to the tag.
 */
function rangeWide(repo: string): string[] {
  const paths = changed(repo);
  return documentationOnly(paths) ? paths : [];
}

/** BROKEN ON PURPOSE. Every documentation file that differs, with no question asked of the commits. */
function everyChangedDoc(repo: string): string[] {
  return changed(repo).filter((path) => documentationOnly([path]));
}

const CORRECTED = '# Guide\n\nCorrected.\n';
const CODE_MOVED = 'export const one = 2;\n';

describe('a documentation-only commit after the tag', () => {
  it('reads that file from the branch', () => {
    const repo = history(BASE, [{ message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } }]);
    assert.deepEqual(ahead(repo).take, ['docs/guide.md']);
    assert.equal(read(hybrid(repo), 'docs/guide.md'), CORRECTED);
  });

  it('control: the same correction inside a commit that also changed code is not read from the branch', () => {
    const repo = history(BASE, [
      { message: 'fix a typo while changing code', write: { 'docs/guide.md': CORRECTED, 'src/index.ts': CODE_MOVED } },
    ]);
    assert.notDeepEqual(ahead(repo).take, ['docs/guide.md']);
  });
});

describe('a mixed commit, which changed code and a document together', () => {
  it('keeps that document at the tag, because it belongs to that code release', () => {
    const repo = history(BASE, [
      { message: 'a feature and its guide', write: { 'docs/guide.md': CORRECTED, 'src/index.ts': CODE_MOVED } },
    ]);
    const answer = ahead(repo);
    assert.deepEqual(answer.take, []);
    assert.deepEqual(answer.heldBack, ['docs/guide.md']);
    assert.equal(read(hybrid(repo), 'docs/guide.md'), BASE['docs/guide.md']);
  });

  it('control: a rule that never looked at the commits would publish the unreleased guide', () => {
    const repo = history(BASE, [
      { message: 'a feature and its guide', write: { 'docs/guide.md': CORRECTED, 'src/index.ts': CODE_MOVED } },
    ]);
    assert.deepEqual(everyChangedDoc(repo), ['docs/guide.md']);
  });
});

/**
 * THE INCIDENT OF 2026-09-19, REPLAYED. A documentation fix went live, and an unrelated code commit
 * pushed later joined the same range and reverted it. The file it reverted had not moved.
 */
describe('a documentation fix followed by an unrelated code commit', () => {
  it('leaves the documentation fix live', () => {
    const repo = history(BASE, [
      { message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } },
      { message: 'somebody else, somewhere else', write: { 'src/index.ts': CODE_MOVED } },
    ]);
    assert.deepEqual(ahead(repo).take, ['docs/guide.md']);
    assert.equal(read(hybrid(repo), 'docs/guide.md'), CORRECTED);
  });

  it('control: the range-wide rule this replaced reverts it', () => {
    const repo = history(BASE, [
      { message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } },
      { message: 'somebody else, somewhere else', write: { 'src/index.ts': CODE_MOVED } },
    ]);
    assert.deepEqual(rangeWide(repo), []);
  });
});

const ADDED = '# Added\n\nA page that did not exist at the tag.\n';

describe('a page that did not exist at the tag', () => {
  it('is quoted when a documentation-only commit added it, and not when a mixed one did', () => {
    const repo = history(BASE, [
      { message: 'a new page', write: { 'docs/added.md': ADDED } },
      { message: 'a feature and its page', write: { 'docs/shipped.md': ADDED, 'src/index.ts': CODE_MOVED } },
    ]);
    const answer = ahead(repo);
    assert.deepEqual(answer.take, ['docs/added.md']);
    assert.deepEqual(answer.heldBack, ['docs/shipped.md']);
    const tree = hybrid(repo);
    assert.ok(existsSync(join(tree, 'docs/added.md')), 'the documentation-only page is in the tree');
    assert.ok(!existsSync(join(tree, 'docs/shipped.md')), 'the mixed page is not');
  });

  it('control: the range-wide rule publishes neither, which is why the new page was stuck', () => {
    const repo = history(BASE, [
      { message: 'a new page', write: { 'docs/added.md': ADDED } },
      { message: 'a feature and its page', write: { 'docs/shipped.md': ADDED, 'src/index.ts': CODE_MOVED } },
    ]);
    assert.deepEqual(rangeWide(repo), []);
  });
});

describe('a document touched by a documentation-only commit and then by a mixed one', () => {
  it('falls back to the tag, because its newest change rode in beside code', () => {
    const repo = history(BASE, [
      { message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } },
      {
        message: 'a feature, and the same guide again',
        write: { 'docs/guide.md': '# Guide\n\nAbout the new thing.\n', 'src/index.ts': CODE_MOVED },
      },
    ]);
    assert.deepEqual(ahead(repo).take, []);
    assert.equal(read(hybrid(repo), 'docs/guide.md'), BASE['docs/guide.md']);
  });

  it('control: one earlier clean commit is not a licence, so a rule that took any of them is wrong', () => {
    const repo = history(BASE, [
      { message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } },
      {
        message: 'a feature, and the same guide again',
        write: { 'docs/guide.md': '# Guide\n\nAbout the new thing.\n', 'src/index.ts': CODE_MOVED },
      },
    ]);
    assert.deepEqual(everyChangedDoc(repo), ['docs/guide.md']);
  });
});

describe('everything that is not documentation', () => {
  it('comes from the tag, whatever moved on the branch', () => {
    const repo = history(BASE, [
      { message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } },
      { message: 'move the code and the compose file', write: { 'src/index.ts': CODE_MOVED, 'compose.yml': 'x: 1\n' } },
    ]);
    const tree = hybrid(repo);
    assert.equal(read(tree, 'src/index.ts'), BASE['src/index.ts']);
    assert.equal(read(tree, 'compose.yml'), BASE['compose.yml']);
    assert.equal(read(tree, 'docs/guide.md'), CORRECTED);
  });

  it('control: an overlay handed every changed path puts the unreleased code in the tree', () => {
    const repo = history(BASE, [
      { message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } },
      { message: 'move the code and the compose file', write: { 'src/index.ts': CODE_MOVED, 'compose.yml': 'x: 1\n' } },
    ]);
    const dir = scratch('hybrid-broken');
    cloneAt(repo, TAG, dir);
    takeFrom({ dir, commit: fetchBranch(dir, BRANCH), take: changed(repo), drop: [] });
    assert.equal(read(dir, 'src/index.ts'), CODE_MOVED);
  });
});

describe('a branch that has not moved past the tag', () => {
  it('gives the tag tree and takes nothing', () => {
    const repo = history(BASE, []);
    const answer = ahead(repo);
    assert.equal(answer.changed, 0);
    assert.equal(answer.commit, null);
    assert.deepEqual(answer.take, []);
    assert.equal(read(hybrid(repo), 'docs/guide.md'), BASE['docs/guide.md']);
  });

  it('control: one documentation-only commit and the same expectation goes red', () => {
    const repo = history(BASE, [{ message: 'fix a typo', write: { 'docs/guide.md': CORRECTED } }]);
    const answer = ahead(repo);
    assert.notEqual(answer.changed, 0);
    assert.notEqual(answer.commit, null);
    assert.notEqual(read(hybrid(repo), 'docs/guide.md'), BASE['docs/guide.md']);
  });
});

describe('a document a documentation-only commit deleted', () => {
  it('is dropped from the tree rather than quoted from the tag', () => {
    const repo = history({ ...BASE, 'docs/old.md': '# Old\n' }, [
      { message: 'retire a page', remove: ['docs/old.md'] },
    ]);
    const answer = ahead(repo);
    assert.deepEqual(answer.drop, ['docs/old.md']);
    assert.ok(!existsSync(join(hybrid(repo), 'docs/old.md')), 'the retired page is gone');
  });

  it('control: a deletion that rode in beside code keeps the page at the tag', () => {
    const repo = history({ ...BASE, 'docs/old.md': '# Old\n' }, [
      { message: 'retire a page and change the code', remove: ['docs/old.md'], write: { 'src/index.ts': CODE_MOVED } },
    ]);
    assert.deepEqual(ahead(repo).drop, []);
    assert.ok(existsSync(join(hybrid(repo), 'docs/old.md')), 'the page is still the tag’s');
  });
});

// ── THE SYNC ITSELF, AGAINST BARE REPOSITORIES ──
// `sync-docs.ts` reads a path with a `.git` directory in it IN PLACE and never resolves a ref, so
// the released path is only reachable through a repository that is not a checkout. `core` and
// `inference` stay in place, because these cases are about `app`.

const CORE = inPlaceRepo('core', manifestFiles('core'));
const INFERENCE = inPlaceRepo('inference', manifestFiles('inference'));

/** A bare clone, which is how the sync's released path is driven with no network. */
function bare(source: string): string {
  const dir = scratch('bare');
  execFileSync('git', ['clone', '--bare', '--quiet', source, dir]);
  return dir;
}

interface Run {
  status: number;
  output: string;
  out: string;
}

function sync(app: string, env: Record<string, string> = {}): Run {
  const out = scratch('out');
  const result = spawnSync('node', ['--import', TSX, SCRIPT], {
    cwd: out,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENPLATE_APP_REPO: app,
      OPENPLATE_SYNC_REPO: CORE,
      OPENPLATE_INFERENCE_REPO: INFERENCE,
      TSX_TSCONFIG_PATH: TSCONFIG,
      ...env,
    },
  });
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}`, out };
}

const APP = manifestFiles('app');
const EXTRA_ROW = '| [**Extra**](./docs/extra.md) | A page added after the tag |';
const EXTRA = '# Extra\n\nA page added after the tag.\n';

describe('the consistency guard on a hybrid tree', () => {
  it('refuses a page the README quoted at the tag has never heard of, and names it', () => {
    const app = bare(history(APP, [{ message: 'a new page, and nothing else', write: { 'docs/extra.md': EXTRA } }]));
    const run = sync(app);
    assert.notEqual(run.status, 0);
    assert.match(run.output, /docs\/extra\.md is quoted from main while README\.md is quoted from v1\.0\.0/);
    assert.match(run.output, /come from different refs/);
    assert.match(run.output, /documentation-only commit that changes both, or wait for the next tag/);
  });

  it('control: the same page added in a commit that updates the README too is published', () => {
    const app = bare(
      history(APP, [
        {
          message: 'a new page and its row',
          write: {
            'docs/extra.md': EXTRA,
            'README.md': readme([
              '| [**Architecture**](./docs/architecture.md) | What it covers |',
              '| [**Topologies**](./docs/topologies.md) | What it covers |',
              EXTRA_ROW,
            ]),
          },
        },
      ]),
    );
    const run = sync(app);
    assert.equal(run.status, 0, run.output);
    assert.ok(existsSync(join(run.out, 'src/generated/docs/app/extra.ts')), 'the new page is published');
  });
});

/** The lead of the fixture's architecture page, corrected without touching a heading. */
const LEAD_FIXED = APP['docs/architecture.md']?.replace(
  "The document's lead paragraph.",
  "The document's lead paragraph, corrected.",
);

/** What `sync-docs.ts` writes per source, as this test reads it back. */
interface Stamp {
  repo: string;
  ref: string;
  commit: string;
  branch: string;
  branchCommit: string | null;
  documentationFrom: string[];
  syncedAt: string;
}

function appStamp(run: Run): Stamp {
  // SAFETY: the sync's own output, read back in the same run that wrote it, and its shape is
  // `SourceStamps` in scripts/sync-docs.ts. A file that is not that shape fails the assertions
  // below by name rather than by type.
  const all = JSON.parse(readFileSync(join(run.out, 'src/generated/SOURCE.json'), 'utf8')) as { app: Stamp };
  return all.app;
}

/** The stamp minus its wall clock, which is the part that has to reproduce. */
function describes(stamp: Stamp): Omit<Stamp, 'syncedAt'> {
  return {
    repo: stamp.repo,
    ref: stamp.ref,
    commit: stamp.commit,
    branch: stamp.branch,
    branchCommit: stamp.branchCommit,
    documentationFrom: stamp.documentationFrom,
  };
}

function page(run: Run): string {
  return readFileSync(join(run.out, 'src/generated/docs/app/architecture.ts'), 'utf8');
}

describe('what SOURCE.json records about a hybrid tree', () => {
  it('names the tag, the branch, the commit the files were read at and the files themselves', () => {
    const app = bare(
      history(APP, [{ message: 'correct a sentence', write: { 'docs/architecture.md': LEAD_FIXED ?? '' } }]),
    );
    const first = sync(app);
    assert.equal(first.status, 0, first.output);
    const recorded = appStamp(first);
    assert.equal(recorded.ref, TAG);
    assert.equal(recorded.branch, BRANCH);
    assert.deepEqual(recorded.documentationFrom, ['docs/architecture.md']);
    assert.match(recorded.branchCommit ?? '', /^[\da-f]{40}$/);
    assert.match(page(first), /corrected/);

    // THE GATE'S OWN RE-QUOTE: pin what the file records, get the same tree.
    const again = sync(app, { OPENPLATE_APP_TAG: recorded.ref });
    assert.equal(again.status, 0, again.output);
    assert.equal(page(again), page(first));
    // `syncedAt` is a wall clock, and the second run writes into an empty directory with no
    // previous stamp to keep. Everything that DESCRIBES the tree has to match.
    assert.deepEqual(describes(appStamp(again)), describes(recorded));
  });

  it('control: pinning only the ref, the way the gate used to, builds a different tree', () => {
    const app = bare(
      history(APP, [{ message: 'correct a sentence', write: { 'docs/architecture.md': LEAD_FIXED ?? '' } }]),
    );
    const first = sync(app);
    assert.equal(first.status, 0, first.output);
    const refOnly = sync(app, { OPENPLATE_APP_REF: TAG });
    assert.equal(refOnly.status, 0, refOnly.output);
    assert.notEqual(page(refOnly), page(first));
    assert.doesNotMatch(page(refOnly), /corrected/);
  });
});
