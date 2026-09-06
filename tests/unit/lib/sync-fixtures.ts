/**
 * Three fixture repositories on disk, and the harness that runs `sync-docs.ts` against them.
 *
 * ── WHY A CHILD PROCESS AND NOT AN IMPORT ──
 * The refusals ARE the script's exit code and the line it prints. `sync-docs.ts` is a program, not
 * a library: it reads three repositories, writes a tree and exits non-zero with the offending file
 * named. Testing an extracted predicate would test a predicate; this runs the program the release
 * workflow runs.
 *
 * ── THE FIXTURE DOCUMENTS ARE DERIVED FROM THE MANIFEST, NOT WRITTEN OUT ──
 * `sync-docs.ts` now also checks that every section the four stack pages quote is still in the tree
 * it just read, so a fixture repository has to hold those documents or every test here fails for a
 * reason none of them is about. Generating them from `STACK_SECTIONS` is what stops that fixture
 * drifting from the manifest the day somebody adds a section to the front page.
 *
 * Nothing here touches the network and nothing writes into this repository. Each case builds three
 * tiny git repositories in a temporary directory and runs the sync with its working directory set
 * to another temporary directory, which is where `src/generated/` and `public/` are resolved
 * against.
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import type { DocComponent } from '../../../app/lib/docs';
import { STACK_PAGES, STACK_SECTIONS } from '../../../app/lib/stack-sections';

export const SCRIPT = resolve(import.meta.dirname, '../../../scripts/sync-docs.ts');

/**
 * `--import tsx`, spelled as a URL.
 *
 * The child runs with its working directory in `/tmp`, so a bare `tsx` would be looked up in
 * `/tmp/node_modules` and not found. Resolving it here resolves it against this file, which is
 * inside the repository that installed it.
 */
export const TSX = import.meta.resolve('tsx');

const scratches: string[] = [];

/** Every temporary directory this module made, gone. Each test file calls it from its own `after`. */
export function disposeScratches(): void {
  for (const dir of scratches) rmSync(dir, { recursive: true, force: true });
  scratches.length = 0;
}

export function scratch(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `openplate-docs-test-${prefix}-`));
  scratches.push(dir);
  return dir;
}

function put(root: string, path: string, body: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

/** The lead the home page's cards quote. Every fixture README carries one, because the sync demands it. */
export const LEAD = 'The repository, in one sentence.';

export function readme(rows: string[]): string {
  return (
    `# A repository\n\n${LEAD}\n\n## Documentation\n\n` +
    `| Guide | What it covers |\n| --- | --- |\n${rows.join('\n')}\n`
  );
}

export const ROW = '| [**Sync**](./docs/sync.md) | Across devices |';
export const GUIDE = '# Sync across devices\n\nA sentence about it.\n';

/** A fixture repository's contents: repo-relative path to file body. */
export type RepoFiles = Record<string, string>;

export interface Fixture {
  /** Documentation table rows for the documents below. */
  rows: string[];
  /** The documents themselves, README excluded. */
  files: RepoFiles;
}

/**
 * The documents one component has to publish for the stack pages to resolve, as markdown.
 *
 * Every document is put under `docs/` whatever the real repository does with it. The slug is the
 * file's basename and the slug is all the manifest addresses, so `PROTOCOL.md` at a repository root
 * and `docs/protocol.md` are the same page to everything under test here.
 */
export function manifestFixture(component: DocComponent, rename?: string): Fixture {
  const headings = new Map<string, string[]>();
  for (const page of STACK_PAGES) {
    for (const address of STACK_SECTIONS[page]) {
      // A README address needs no document. `readme()` gives every fixture repository a lead.
      if (address.component !== component || address.from.kind === 'readme') continue;
      const known = headings.get(address.from.slug) ?? [];
      if (address.from.kind === 'doc' && !known.includes(address.from.heading)) known.push(address.from.heading);
      headings.set(address.from.slug, known);
    }
  }

  const rows: string[] = [];
  const files: RepoFiles = {};
  for (const [slug, names] of headings) {
    const title = slug.charAt(0).toUpperCase() + slug.slice(1);
    const body = names.map((name) => `## ${name === rename ? `${name}, reworded` : name}\n\nA sentence under it.\n`);
    files[`docs/${slug}.md`] = `# ${title}\n\nThe document's lead paragraph.\n\n${body.join('\n')}`;
    rows.push(`| [**${title}**](./docs/${slug}.md) | What it covers |`);
  }
  return { rows, files };
}

/** One component's fixture repository contents, README and all. */
export function manifestFiles(component: DocComponent, rename?: string): RepoFiles {
  const fixture = manifestFixture(component, rename);
  fixture.files['README.md'] = readme(fixture.rows);
  return fixture.files;
}

/** A git repository with one commit, so the sync can read a sha out of it. */
export function repo(prefix: string, files: RepoFiles): string {
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

export type Overrides = Partial<Record<DocComponent, RepoFiles>>;

/** Three fixture sources, each satisfying the manifest unless the caller broke one on purpose. */
export function sources(overrides: Overrides = {}) {
  return {
    app: repo('app', overrides.app ?? manifestFiles('app')),
    sync: repo('sync', overrides.sync ?? manifestFiles('sync')),
    inference: repo('inference', overrides.inference ?? manifestFiles('inference')),
  };
}

export interface Run {
  status: number;
  output: string;
  out: string;
}

export function sync(overrides: Overrides = {}): Run {
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
