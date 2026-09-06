/**
 * The icon sync, against a fixture application repository on disk.
 *
 * Run as a CHILD PROCESS, like the documentation sync's tests and for the same reason: the refusal
 * IS the exit code and the line the script prints. The fixture files are short strings and not real
 * pictures, because every claim here is about which bytes ended up at which path, and a PNG header
 * would only make the fixture harder to read.
 *
 * Nothing here touches the network and nothing writes into this repository: the source is a
 * temporary git repository and the working directory is another temporary directory, which is what
 * `public/` resolves against.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';

import { type RepoFiles, TSX, disposeScratches, repo, scratch } from './lib/sync-fixtures';

after(disposeScratches);

const SCRIPT = resolve(import.meta.dirname, '../../scripts/sync-icons.ts');

/** The four files the site serves, and the fixture bytes each one carries. */
const UPSTREAM = {
  'public/favicon.ico': 'the tab mark',
  'public/icons/apple-touch-icon.png': 'the home screen mark',
  'public/icons/icon-192.png': 'the small mark',
  'public/icons/icon-512.png': 'the large mark',
};

interface Run {
  status: number;
  output: string;
  /** The working directory the sync wrote into, which is where `public/` is. */
  out: string;
}

/** One sync run against a fixture repository, into a fresh working directory unless one is given. */
function sync(files: RepoFiles = UPSTREAM, out = scratch('icons-out')): Run {
  const source = repo('icons-app', files);
  const result = spawnSync('node', ['--import', TSX, SCRIPT], {
    cwd: out,
    encoding: 'utf8',
    env: { ...process.env, OPENPLATE_APP_REPO: source },
  });
  return { status: result.status ?? -1, output: `${result.stdout}${result.stderr}`, out };
}

function put(out: string, path: string, body: string): void {
  const file = join(out, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
}

function read(out: string, path: string): string {
  return readFileSync(join(out, path), 'utf8');
}

/** The upstream fixture with one file taken away, which is the only way this sync can fail. */
function without(path: keyof typeof UPSTREAM): RepoFiles {
  return Object.fromEntries(Object.entries(UPSTREAM).filter(([name]) => name !== path));
}

describe('the icon sync against an application that has the mark', () => {
  it('copies every named file, bytes and all', () => {
    const run = sync();
    assert.equal(run.status, 0, run.output);
    for (const [path, body] of Object.entries(UPSTREAM)) {
      assert.equal(read(run.out, path), body, path);
    }
  });

  it('prunes a file under public/icons/ that the manifest no longer names', () => {
    const out = scratch('icons-out');
    put(out, 'public/icons/icon-maskable-512.png', 'a mark nothing declares');
    const run = sync(UPSTREAM, out);
    assert.equal(run.status, 0, run.output);
    assert.ok(!existsSync(join(out, 'public/icons/icon-maskable-512.png')));
    assert.match(run.output, /pruned .*icon-maskable-512\.png/);
  });

  it('writes the same bytes when it runs twice', () => {
    const out = scratch('icons-out');
    assert.equal(sync(UPSTREAM, out).status, 0);
    const first = read(out, 'public/icons/icon-512.png');
    assert.equal(sync(UPSTREAM, out).status, 0);
    assert.equal(read(out, 'public/icons/icon-512.png'), first);
  });
});

describe('the icon sync against an application that has lost a file', () => {
  it('fails, naming the file it could not find', () => {
    const run = sync(without('public/icons/icon-512.png'));
    assert.notEqual(run.status, 0);
    assert.match(run.output, /public\/icons\/icon-512\.png/);
  });

  it('leaves the icons already on disk exactly where they were', () => {
    const out = scratch('icons-out');
    put(out, 'public/icons/icon-512.png', 'the mark the site is serving today');
    const run = sync(without('public/icons/apple-touch-icon.png'), out);
    assert.notEqual(run.status, 0);
    assert.equal(read(out, 'public/icons/icon-512.png'), 'the mark the site is serving today');
  });
});
