/**
 * The translation memory union, which is the one rule in the docs sync that can lose money.
 *
 * `sync-docs.yml` resolves a conflicted generated tree by regenerating: it takes the branch and
 * reapplies this run's output, because a text merge of two complete generations matches neither
 * input. `src/generated/docs-i18n/*.json` is the exception. It is not derived from the three source
 * repositories, it is a record of sentences a model was PAID to translate, so a run that replaced
 * it whole would drop what the run before it bought and the next run would buy those sentences
 * again.
 *
 * Run as a CHILD PROCESS, like the other sync tests here and for the same reason: importing the
 * module runs the program. What is pinned below is the file the workflow will actually invoke,
 * arguments, exit code and written bytes.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';

import type { Memo, Memory } from '../../app/lib/docs-i18n.server';

import { TSCONFIG, TSX, disposeScratches, scratch } from './lib/sync-fixtures';

after(disposeScratches);

const SCRIPT = resolve(import.meta.dirname, '../../scripts/merge-memory.ts');

/** One memory entry, with the German it stands for. */
function memo(en: string, de: string): Memo {
  return { en, model: 'google/gemini-3.8-flash', at: '2026-09-07', de };
}

/** A memory directory on disk, or a path to one that was never written. */
function memoryDir(prefix: string, files: Record<string, Memory> | null): string {
  const dir = scratch(prefix);
  if (files === null) return join(dir, 'never-written');
  for (const [name, memory] of Object.entries(files)) {
    writeFileSync(join(dir, name), `${JSON.stringify(memory, null, 2)}\n`, 'utf8');
  }
  return dir;
}

interface Merge {
  status: number;
  output: string;
  /** The directory the union was written to. */
  out: string;
}

function merge(branch: string, run: string): Merge {
  const out = scratch('merged');
  const result = spawnSync(
    process.execPath,
    ['--import', TSX, SCRIPT, '--branch', branch, '--run', run, '--out', out],
    { encoding: 'utf8', env: { ...process.env, TSX_TSCONFIG_PATH: TSCONFIG } },
  );
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}`, out };
}

function read(dir: string, name: string): Memory {
  // SAFETY: the file was written by the script under test one line earlier, and a shape other than
  // the memory's is exactly what the assertions below are there to catch.
  return JSON.parse(readFileSync(join(dir, name), 'utf8')) as Memory;
}

describe('merge-memory', () => {
  it('keeps every key from both sides', () => {
    const branch = memoryDir('branch', { 'de.json': { aaa: memo('The branch bought this.', 'Der Zweig.') } });
    const run = memoryDir('run', { 'de.json': { bbb: memo('This run bought this.', 'Dieser Lauf.') } });

    const result = merge(branch, run);

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(Object.keys(read(result.out, 'de.json')), ['aaa', 'bbb']);
  });

  it("keeps this run's value where both sides hold the same key", () => {
    // The key is a hash of the English, so both sides translated the same sentence and both answers
    // are correct German. There is nothing to adjudicate, so the run wins, the same as it does for
    // every other generated file.
    const shared = 'One sentence, translated twice.';
    const branch = memoryDir('branch', { 'de.json': { aaa: memo(shared, 'Die erste Antwort.') } });
    const run = memoryDir('run', { 'de.json': { aaa: memo(shared, 'Die zweite Antwort.') } });

    const result = merge(branch, run);

    assert.equal(result.status, 0, result.output);
    assert.equal(read(result.out, 'de.json').aaa?.de, 'Die zweite Antwort.');
  });

  it('unions every locale, and a locale only one side has', () => {
    // The run that ADDS a language looks exactly like this from the branch's point of view.
    const branch = memoryDir('branch', {
      'de.json': { aaa: memo('German only on the branch.', 'Nur im Zweig.') },
    });
    const run = memoryDir('run', {
      'de.json': { bbb: memo('German only in the run.', 'Nur im Lauf.') },
      'fr.json': { ccc: memo('French, bought for the first time.', 'Le premier.') },
    });

    const result = merge(branch, run);

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(Object.keys(read(result.out, 'de.json')), ['aaa', 'bbb']);
    assert.deepEqual(Object.keys(read(result.out, 'fr.json')), ['ccc']);
  });

  it('writes the shape translate-docs writes: sorted by hash, two spaces, one trailing newline', () => {
    // A union that wrote a different shape would show up as a whole-file diff on the next
    // translation run, which is a commit, a deploy and a chance for the publish to stall.
    const branch = memoryDir('branch', { 'de.json': { fff: memo('Last by hash.', 'Zuletzt.') } });
    const run = memoryDir('run', { 'de.json': { aaa: memo('First by hash.', 'Zuerst.') } });

    const result = merge(branch, run);

    const text = readFileSync(join(result.out, 'de.json'), 'utf8');
    assert.equal(result.status, 0, result.output);
    assert.match(text, /^\{\n {2}"aaa": \{\n {4}"en"/u);
    assert.ok(text.endsWith('}\n'), 'the file should end with exactly one newline');
    assert.deepEqual(Object.keys(read(result.out, 'de.json')), ['aaa', 'fff']);
  });

  it('treats a missing directory as an empty side', () => {
    // The first run of a locale, and the recovery of a commit that carries no memory at all.
    const run = memoryDir('run', { 'de.json': { aaa: memo('The only entry.', 'Der einzige Eintrag.') } });

    const result = merge(memoryDir('branch', null), run);

    assert.equal(result.status, 0, result.output);
    assert.deepEqual(Object.keys(read(result.out, 'de.json')), ['aaa']);
  });

  it('reports what it saved from the branch, so the workflow log says it', () => {
    const branch = memoryDir('branch', {
      'de.json': { aaa: memo('Bought by the other run.', 'Vom anderen Lauf.'), bbb: memo('Also.', 'Auch.') },
    });
    const run = memoryDir('run', { 'de.json': { bbb: memo('Also.', 'Auch.'), ccc: memo('Mine.', 'Meins.') } });

    const result = merge(branch, run);

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /de\.json: 3 entries, 1 kept from the branch/u);
  });

  it('refuses without the three directories, naming the flag', () => {
    const result = spawnSync(process.execPath, ['--import', TSX, SCRIPT, '--branch', scratch('branch')], {
      encoding: 'utf8',
      env: { ...process.env, TSX_TSCONFIG_PATH: TSCONFIG },
    });

    assert.equal(result.status, 1);
    assert.match(`${result.stdout}${result.stderr}`, /--run <dir> is required/u);
  });

  it('can write over one of its own inputs', () => {
    // The workflow points `--out` at the working tree it just restored, which is `--run`'s content.
    const branch = memoryDir('branch', { 'de.json': { aaa: memo('The branch bought this.', 'Der Zweig.') } });
    const run = memoryDir('run', { 'de.json': { bbb: memo('This run bought this.', 'Dieser Lauf.') } });

    const result = spawnSync(
      process.execPath,
      ['--import', TSX, SCRIPT, '--branch', branch, '--run', run, '--out', run],
      { encoding: 'utf8', env: { ...process.env, TSX_TSCONFIG_PATH: TSCONFIG } },
    );

    assert.equal(result.status, 0, `${result.stdout}${result.stderr}`);
    assert.ok(existsSync(join(run, 'de.json')));
    assert.deepEqual(Object.keys(read(run, 'de.json')), ['aaa', 'bbb']);
  });
});
