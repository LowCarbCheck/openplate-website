/**
 * The manifest checks, against fixture repositories on disk.
 *
 * ── WHY A CHILD PROCESS AND NOT AN IMPORT ──
 * The refusals ARE the script's exit code and the line it prints. `sync-docs.ts`
 * is a program, not a library: it reads three repositories, writes a tree and
 * exits non-zero with the offending file named. Testing an extracted predicate
 * would test a predicate; this runs the program the release workflow runs.
 *
 * Nothing here touches the network and nothing writes into this repository. Each
 * case builds three tiny git repositories in a temporary directory and runs the
 * sync with its working directory set to another temporary directory, which is
 * where `src/generated/` and `public/` are resolved against.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';

const SCRIPT = resolve(import.meta.dirname, '../../scripts/sync-docs.ts');
/**
 * `--import tsx`, spelled as a URL.
 *
 * The child runs with its working directory in `/tmp`, so a bare `tsx` would be
 * looked up in `/tmp/node_modules` and not found. Resolving it here resolves it
 * against this file, which is inside the repository that installed it.
 */
const TSX = import.meta.resolve('tsx');

const scratches: string[] = [];

after(() => {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
});

function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `openplate-docs-test-${prefix}-`));
  scratches.push(dir);
  return dir;
}

function put(root: string, path: string, body: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

function readme(rows: string[]): string {
  return `# A repository\n\n## Documentation\n\n| Guide | What it covers |\n| --- | --- |\n${rows.join('\n')}\n`;
}

const ROW = '| [**Sync**](./docs/sync.md) | Across devices |';
const GUIDE = '# Sync across devices\n\nA sentence about it.\n';

/** A git repository with one commit, so the sync can read a sha out of it. */
function repo(prefix: string, files: Record<string, string>): string {
  const dir = scratch(prefix);
  for (const [path, body] of Object.entries(files)) put(dir, path, body);
  const git = (args: string[]) =>
    spawnSync('git', args, {
      cwd: dir,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: 'test',
        GIT_AUTHOR_EMAIL: 'test@example.com',
        GIT_COMMITTER_NAME: 'test',
        GIT_COMMITTER_EMAIL: 'test@example.com',
      },
    });
  git(['init', '--quiet', '--initial-branch=main']);
  git(['add', '-A']);
  git(['commit', '--quiet', '-m', 'fixture']);
  return dir;
}

/** Three fixture sources, each valid unless the caller broke one on purpose. */
function sources(overrides: Partial<Record<'app' | 'sync' | 'inference', Record<string, string>>> = {}) {
  const valid = { 'README.md': readme([ROW]), 'docs/sync.md': GUIDE };
  return {
    app: repo('app', overrides.app ?? valid),
    sync: repo('sync', overrides.sync ?? valid),
    inference: repo('inference', overrides.inference ?? valid),
  };
}

interface Run {
  status: number;
  output: string;
  out: string;
}

function sync(overrides: Partial<Record<'app' | 'sync' | 'inference', Record<string, string>>> = {}): Run {
  const repos = sources(overrides);
  const out = scratch('out');
  const result = spawnSync('node', ['--import', TSX, SCRIPT], {
    cwd: out,
    encoding: 'utf8',
    env: {
      ...process.env,
      OPENPLATE_APP_REPO: repos.app,
      OPENPLATE_SYNC_REPO: repos.sync,
      OPENPLATE_INFERENCE_REPO: repos.inference,
    },
  });
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}`, out };
}

describe('the sync against a manifest that agrees with the tree', () => {
  it('writes a module per page, an index, release notes and SOURCE.json', () => {
    const run = sync();
    assert.equal(run.status, 0, run.output);
    for (const component of ['app', 'sync', 'inference']) {
      assert.ok(existsSync(join(run.out, 'src/generated/docs', component, 'sync.ts')), `${component} page`);
      assert.ok(existsSync(join(run.out, 'src/generated/releases', `${component}.ts`)), `${component} releases`);
    }
    assert.ok(existsSync(join(run.out, 'src/generated/docs-index.ts')));
    assert.ok(existsSync(join(run.out, 'src/generated/SOURCE.json')));
    assert.ok(existsSync(join(run.out, 'public/SOURCE.json')));
  });
});

describe('the sync against a manifest that has drifted', () => {
  it('refuses a documentation table row whose file is not in the tree', () => {
    const run = sync({ app: { 'README.md': readme([ROW]) } });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /docs\/sync\.md/);
  });

  it('refuses a docs file that no table row mentions', () => {
    const run = sync({
      app: { 'README.md': readme([ROW]), 'docs/sync.md': GUIDE, 'docs/orphan.md': '# Orphan\n' },
    });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /disagree/);
    assert.match(run.output, /docs\/orphan\.md/);
  });

  it('refuses a page with no `# ` title', () => {
    const run = sync({ app: { 'README.md': readme([ROW]), 'docs/sync.md': 'No title here.\n' } });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /has no `# ` title/);
  });

  it('refuses an image that is not under docs/images/', () => {
    const run = sync({
      app: {
        'README.md': readme([ROW]),
        'docs/sync.md': '# Sync\n\n![A diagram](../assets/diagram.png)\n',
      },
    });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /assets\/diagram\.png/);
    assert.match(run.output, /docs\/images/);
  });

  it('refuses a README with no Documentation section at all', () => {
    const run = sync({ app: { 'README.md': '# A repository\n\nNothing.\n', 'docs/sync.md': GUIDE } });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /Documentation section/);
  });

  it('excludes docs/README.md and the ADRs from the drift check', () => {
    const run = sync({
      app: {
        'README.md': readme([ROW]),
        'docs/sync.md': GUIDE,
        'docs/README.md': '# Index\n',
        'docs/adr/0001-a-decision.md': '# A decision\n',
      },
    });
    assert.equal(run.status, 0, run.output);
  });
});
