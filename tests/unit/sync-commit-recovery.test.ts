/**
 * The Commit step of `.github/workflows/sync-docs.yml`, run against real git repositories.
 *
 * ── WHY THIS TEST EXISTS ──
 * On 2026-09-07 three release tags were pushed within a minute and each dispatched a sync. The
 * first landed. The third conflicted on `public/SOURCE.json`, `src/generated/SOURCE.json` and
 * `src/generated/docs-i18n/de.json`, and its retry loop then failed twice more on `error: Pulling
 * is not possible because you have unmerged files`, because nothing aborted the conflicted rebase.
 * The loop looked right and could not retry, and nothing was lost only because a person merged the
 * same content by hand. Arguing the repair in prose is what produced that loop, so this drives it:
 * two clones both regenerate a conflicting tree, one pushes first, and the other has to land anyway
 * with the right content and a memory that lost no purchase.
 *
 * ── THE STEP IS EXTRACTED FROM THE WORKFLOW, NOT COPIED INTO THIS FILE ──
 * A copy would pass forever while the workflow rots. `commitStep()` below reads the `run:` block
 * out of the YAML by its indentation and substitutes the `${{ }}` expressions, refusing loudly on
 * an expression it does not know, so a step that grows a new one breaks this test rather than
 * silently running a different script than CI does.
 *
 * The substitution names a repository and a tag, which is the branch of the step that a release
 * DISPATCH takes, and it is the case that failed. It also avoids `jq`, which the other branch
 * shells out to and which the ts-dev toolbox does not carry.
 *
 * Nothing here touches the network. Every remote is a bare repository in a temporary directory.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';

import type { Memo, Memory } from '../../app/lib/docs-i18n.server';

import { TSCONFIG, TSX, disposeScratches, scratch } from './lib/sync-fixtures';

after(disposeScratches);

const WORKFLOW = resolve(import.meta.dirname, '../../.github/workflows/sync-docs.yml');
const MERGE_MEMORY_SCRIPT = resolve(import.meta.dirname, '../../scripts/merge-memory.ts');

/**
 * The values this test stands in for the workflow's `${{ }}` expressions.
 *
 * A dispatch payload, because that is the run that raced. An expression outside this map is a
 * refusal: the step would then be doing something this test does not simulate.
 */
const EXPRESSIONS = new Map<string, string>([
  ['github.event.client_payload.repo', 'openplate'],
  ['github.event.client_payload.tag', 'v0.10.3'],
]);

/** The Commit step's shell, dedented and with the expressions filled in. */
function commitStep(): string {
  const lines = readFileSync(WORKFLOW, 'utf8').split('\n');
  const at = lines.findIndex((line) => line.trim() === '- name: Commit');
  assert.notEqual(at, -1, 'the workflow no longer has a step named Commit');
  const start = lines.findIndex((line, index) => index > at && line.trim() === 'run: |');
  assert.notEqual(start, -1, 'the Commit step no longer has a `run: |` block');
  const indent = `${' '.repeat(lines[start]?.indexOf('run:') ?? 0)}  `;

  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line !== '' && !line.startsWith(indent)) break;
    body.push(line.slice(indent.length));
  }
  return body.join('\n').replaceAll(/\$\{\{\s*(?<expression>[^}]+?)\s*\}\}/gu, (whole, expression: string) => {
    const value = EXPRESSIONS.get(expression);
    assert.notEqual(value, undefined, `the Commit step uses ${whole}, which this test does not stand in for`);
    return value ?? '';
  });
}

const STEP = (() => {
  const file = join(scratch('step'), 'commit.sh');
  writeFileSync(file, commitStep(), 'utf8');
  return file;
})();

const GIT_IDENTITY = {
  GIT_AUTHOR_NAME: 'test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'test',
  GIT_COMMITTER_EMAIL: 'test@example.com',
};

function git(cwd: string, args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8', env: { ...process.env, ...GIT_IDENTITY } });
  assert.equal(result.status, 0, `git ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result.stdout.trim();
}

function put(root: string, path: string, body: string): void {
  const file = join(root, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body, 'utf8');
}

function memo(en: string, de: string): Memo {
  return { en, model: 'google/gemini-3.8-flash', at: '2026-09-07', de };
}

/** One complete generation, as `pnpm sync:docs` would leave the working tree. */
interface Generation {
  /** The tag the whole tree claims to quote. Every generated file carries it. */
  tag: string;
  /** `src/generated/docs/app/<slug>.ts`, one entry per page this generation publishes. */
  pages: Record<string, string>;
  /** The translation memory this generation holds, entries and all. */
  memory: Memory;
}

/** Write a generation over a working tree, leaving it uncommitted, which is what the step expects. */
function generate(clone: string, generation: Generation): void {
  const source = `${JSON.stringify({ app: { ref: generation.tag, commit: generation.tag } }, null, 2)}\n`;
  put(clone, 'src/generated/SOURCE.json', source);
  put(clone, 'public/SOURCE.json', source);
  for (const [slug, body] of Object.entries(generation.pages)) {
    put(clone, `src/generated/docs/app/${slug}.ts`, `export const DOC = ${JSON.stringify(body)};\n`);
  }
  put(clone, 'src/generated/docs-i18n/de.json', `${JSON.stringify(generation.memory, null, 2)}\n`);
}

interface StepRun {
  status: number;
  output: string;
}

/** The Commit step, in a clone, with the two seams the step reserves for this test. */
function commit(clone: string): StepRun {
  const temp = scratch('step-env');
  const result = spawnSync('bash', [STEP], {
    cwd: clone,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...GIT_IDENTITY,
      GITHUB_OUTPUT: join(temp, 'output'),
      GITHUB_STEP_SUMMARY: join(temp, 'summary'),
      // The clones are in /tmp with no node_modules, so the workflow's `node --import tsx
      // scripts/merge-memory.ts` would resolve neither. Same script, named absolutely.
      MERGE_MEMORY: `${process.execPath} --import ${TSX} ${MERGE_MEMORY_SCRIPT}`,
      TSX_TSCONFIG_PATH: TSCONFIG,
      // The five second wait between attempts is right in CI and is dead time here.
      RETRY_PAUSE: '0',
    },
  });
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}` };
}

/** A bare `origin` holding one generation, and a clone of it per run that is about to race. */
function origin(pages: Record<string, string>, memory: Memory): string {
  const bare = join(scratch('origin'), 'origin.git');
  git(scratch('init'), ['init', '--quiet', '--bare', '--initial-branch=main', bare]);
  const seed = scratch('seed');
  git(seed, ['clone', '--quiet', bare, seed]);
  // A file this job does not own and never stages. It is here to prove that taking the branch does
  // not throw away what a person pushed while the sync ran.
  put(seed, 'README.md', 'The site, as it was before either run.\n');
  generate(seed, { tag: 'v0.10.1', pages, memory });
  git(seed, ['add', '-A']);
  git(seed, ['commit', '--quiet', '-m', 'the tree both runs started from']);
  git(seed, ['push', '--quiet', 'origin', 'HEAD:main']);
  return bare;
}

function workingCopy(bare: string, prefix: string): string {
  const dir = scratch(prefix);
  git(scratch('init'), ['clone', '--quiet', bare, dir]);
  return dir;
}

/** The tree as `origin` now holds it, read from a fresh clone rather than from either racer. */
function landed(bare: string): string {
  return workingCopy(bare, 'landed');
}

function readMemory(tree: string): Memory {
  // SAFETY: the file is written by `merge-memory.ts` through the same `saveMemory` that
  // `translate-docs` uses. A different shape is what these assertions exist to catch.
  return JSON.parse(readFileSync(join(tree, 'src/generated/docs-i18n/de.json'), 'utf8')) as Memory;
}

const BASE_MEMORY: Memory = { '0000000000000000': memo('A sentence both runs started with.', 'Ein Satz.') };

describe('the Commit step, when the branch moved under it', () => {
  it('lands the losing run anyway, and lands its whole generation rather than a merge', () => {
    const bare = origin({ sync: 'Sync, at v0.10.1' }, BASE_MEMORY);
    const first = workingCopy(bare, 'first');
    const second = workingCopy(bare, 'second');

    // Both runs re-quote all three repositories, minutes apart, and resolve different tags. Neither
    // output is partial: each is a complete sync of everything.
    generate(first, {
      tag: 'v0.10.2',
      // A page only the earlier run published. This run's generation does not carry it, so it must
      // not survive: an upstream deletion has to reach the site.
      pages: { sync: 'Sync, at v0.10.2', gone: 'A guide the next release removed' },
      memory: { ...BASE_MEMORY, aaaaaaaaaaaaaaaa: memo('Bought by the first run.', 'Vom ersten Lauf.') },
    });
    generate(second, {
      tag: 'v0.10.3',
      pages: { sync: 'Sync, at v0.10.3' },
      memory: { ...BASE_MEMORY, bbbbbbbbbbbbbbbb: memo('Bought by the second run.', 'Vom zweiten Lauf.') },
    });

    const won = commit(first);
    const lost = commit(second);

    assert.equal(won.status, 0, won.output);
    assert.equal(lost.status, 0, lost.output);
    assert.match(lost.output, /Regenerating onto it/u, 'the losing run should have taken the recovery path');

    const tree = landed(bare);
    const source = readFileSync(join(tree, 'src/generated/SOURCE.json'), 'utf8');
    // The whole tree is the second run's, and every part of it agrees. This is the claim a text
    // merge cannot make: it would leave a page at one tag beside a SOURCE.json from another.
    assert.match(source, /v0\.10\.3/u);
    assert.equal(readFileSync(join(tree, 'public/SOURCE.json'), 'utf8'), source);
    assert.match(readFileSync(join(tree, 'src/generated/docs/app/sync.ts'), 'utf8'), /Sync, at v0\.10\.3/u);
    assert.ok(!existsSync(join(tree, 'src/generated/docs/app/gone.ts')), 'a page dropped upstream should be gone');
    // No conflict markers anywhere in the tree the site would publish.
    assert.doesNotMatch(source, /<<<<<<</u);
  });

  it('drops no bought translation, and keeps its own value where both bought the same sentence', () => {
    const shared = 'One sentence, translated twice.';
    const bare = origin({ sync: 'Sync, at v0.10.1' }, BASE_MEMORY);
    const first = workingCopy(bare, 'first');
    const second = workingCopy(bare, 'second');

    generate(first, {
      tag: 'v0.10.2',
      pages: { sync: 'Sync, at v0.10.2' },
      memory: {
        ...BASE_MEMORY,
        aaaaaaaaaaaaaaaa: memo('Bought by the first run.', 'Vom ersten Lauf.'),
        cccccccccccccccc: memo(shared, 'Die erste Antwort.'),
      },
    });
    generate(second, {
      tag: 'v0.10.3',
      pages: { sync: 'Sync, at v0.10.3' },
      memory: {
        ...BASE_MEMORY,
        bbbbbbbbbbbbbbbb: memo('Bought by the second run.', 'Vom zweiten Lauf.'),
        cccccccccccccccc: memo(shared, 'Die zweite Antwort.'),
      },
    });

    assert.equal(commit(first).status, 0);
    const lost = commit(second);
    assert.equal(lost.status, 0, lost.output);

    const memory = readMemory(landed(bare));
    // Every purchase from both runs is still here. The first run's entry is the one a
    // regenerate-wins rule would have deleted, and the next run would have paid for it again.
    assert.deepEqual(Object.keys(memory), [
      '0000000000000000',
      'aaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbb',
      'cccccccccccccccc',
    ]);
    assert.equal(memory.cccccccccccccccc?.de, 'Die zweite Antwort.');
  });

  it('keeps what a person pushed while the sync ran', () => {
    const bare = origin({ sync: 'Sync, at v0.10.1' }, BASE_MEMORY);
    const person = workingCopy(bare, 'person');
    const second = workingCopy(bare, 'second');

    generate(second, {
      tag: 'v0.10.3',
      pages: { sync: 'Sync, at v0.10.3' },
      memory: { ...BASE_MEMORY, bbbbbbbbbbbbbbbb: memo('Bought by the sync.', 'Vom Lauf.') },
    });
    // A hand edit to a file this job does not own, and a generation on top of it, so the branch
    // moved for two reasons at once.
    put(person, 'README.md', 'The site, edited by hand while the sync ran.\n');
    generate(person, {
      tag: 'v0.10.2',
      pages: { sync: 'Sync, at v0.10.2' },
      memory: BASE_MEMORY,
    });
    git(person, ['add', '-A']);
    git(person, ['commit', '--quiet', '-m', 'a person, mid sync']);
    git(person, ['push', '--quiet', 'origin', 'HEAD:main']);

    const lost = commit(second);

    assert.equal(lost.status, 0, lost.output);
    const tree = landed(bare);
    assert.match(readFileSync(join(tree, 'README.md'), 'utf8'), /edited by hand/u);
    assert.match(readFileSync(join(tree, 'src/generated/docs/app/sync.ts'), 'utf8'), /Sync, at v0\.10\.3/u);
  });

  it('exits 0 without a commit when the branch already carries this generation', () => {
    // Two dispatches minutes apart that resolve the same tags produce the same tree. The second one
    // has nothing to add and must not fail for it.
    const bare = origin({ sync: 'Sync, at v0.10.1' }, BASE_MEMORY);
    const first = workingCopy(bare, 'first');
    const second = workingCopy(bare, 'second');
    const same: Generation = {
      tag: 'v0.10.3',
      pages: { sync: 'Sync, at v0.10.3' },
      memory: { ...BASE_MEMORY, bbbbbbbbbbbbbbbb: memo('Bought once.', 'Einmal gekauft.') },
    };
    generate(first, same);
    generate(second, same);

    assert.equal(commit(first).status, 0);
    const twin = commit(second);

    assert.equal(twin.status, 0, twin.output);
    assert.equal(git(landed(bare), ['rev-list', '--count', 'HEAD']), '2');
    // Recorded rather than assumed: this one never reaches the recovery. The rebase drops a commit
    // whose patch is already applied, so the twin dispatch costs nothing and pushes nothing.
    assert.doesNotMatch(twin.output, /Regenerating onto it/u);
  });

  it('fails loudly and names the branch it lost to', () => {
    const bare = origin({ sync: 'Sync, at v0.10.1' }, BASE_MEMORY);
    // A remote that refuses every push, which is what a protected branch, a spent token or a race
    // that never settles all look like from here.
    const hook = join(bare, 'hooks', 'pre-receive');
    writeFileSync(hook, '#!/bin/sh\necho "refused" >&2\nexit 1\n', { mode: 0o755 });
    const run = workingCopy(bare, 'refused');
    generate(run, { tag: 'v0.10.3', pages: { sync: 'Sync, at v0.10.3' }, memory: BASE_MEMORY });

    const result = commit(run);

    assert.equal(result.status, 1);
    assert.match(result.output, /Could not land the re-quoted docs after 3 attempts/u);
    assert.match(result.output, new RegExp(git(run, ['rev-parse', '--short', 'origin/main']), 'u'));
    assert.match(result.output, /the tree both runs started from/u);
  });
});
