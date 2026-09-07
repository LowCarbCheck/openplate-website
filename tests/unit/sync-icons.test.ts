/**
 * The icon sync, against a fixture brand repository on disk.
 *
 * Run as a CHILD PROCESS, like the documentation sync's tests and for the same reason: the refusal
 * IS the exit code and the line the script prints. The fixture files are short strings and not real
 * pictures, because every claim here is about which bytes ended up at which path, and a PNG header
 * would only make the fixture harder to read. The fixture `MANIFEST.json` is BUILT from those
 * strings rather than written out, so a test that changes a fixture byte cannot forget to change
 * the hash beside it, which is the whole failure the sha256 check exists to catch.
 *
 * Nothing here touches the network and nothing writes into this repository: the source is a
 * temporary git repository and the working directory is another temporary directory, which is what
 * `public/` resolves against.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { after, describe, it } from 'node:test';

import { type RepoFiles, TSX, disposeScratches, repo, scratch } from './lib/sync-fixtures';

after(disposeScratches);

const SCRIPT = resolve(import.meta.dirname, '../../scripts/sync-icons.ts');

/**
 * Every asset the site installs: where it sits in the brand repository, where it lands here, and
 * the fixture bytes it carries. `from` and `to` differ on purpose, because the repoint moved the
 * upstream path and left the served path alone, and one table is what proves that.
 */
interface Fixed {
  from: string;
  to: string;
  body: string;
}

const FIXED: Fixed[] = [
  { from: 'assets/favicon.ico', to: 'public/favicon.ico', body: 'the tab mark' },
  { from: 'assets/apple-touch-icon.png', to: 'public/icons/apple-touch-icon.png', body: 'the home screen mark' },
  { from: 'assets/icon-192.png', to: 'public/icons/icon-192.png', body: 'the small mark' },
  { from: 'assets/icon-512.png', to: 'public/icons/icon-512.png', body: 'the large mark' },
];

/** The brand repository's assets, with no manifest beside them yet. */
const ASSETS: RepoFiles = Object.fromEntries(FIXED.map((icon) => [icon.from, icon.body]));

/**
 * The fixture repository: the assets, plus the manifest the brand repository publishes beside them.
 *
 * `overrides` names assets whose manifest hash should be a lie, which is how a hand edited or a
 * damaged upstream tree is spelled here.
 */
function brand(files: RepoFiles = ASSETS, overrides: RepoFiles = {}): RepoFiles {
  const assets: RepoFiles = {};
  for (const [path, body] of Object.entries(files)) {
    const hashed = overrides[path] ?? body;
    assets[basename(path)] = createHash('sha256').update(hashed).digest('hex');
  }
  const manifest = {
    producedBy: 'the icon sync test',
    assets: Object.fromEntries(Object.entries(assets).map(([name, sha256]) => [name, { sha256 }])),
  };
  return { ...files, 'assets/MANIFEST.json': JSON.stringify(manifest, null, 2) };
}

interface Run {
  status: number;
  output: string;
  /** The working directory the sync wrote into, which is where `public/` is. */
  out: string;
}

/** One sync run against a fixture repository, into a fresh working directory unless one is given. */
function sync(files: RepoFiles = brand(), out = scratch('icons-out')): Run {
  const source = repo('icons-brand', files);
  const result = spawnSync('node', ['--import', TSX, SCRIPT], {
    cwd: out,
    encoding: 'utf8',
    env: { ...process.env, OPENPLATE_BRAND_REPO: source },
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

/** The upstream fixture with one asset taken away. */
function without(path: string): RepoFiles {
  return brand(Object.fromEntries(Object.entries(ASSETS).filter(([name]) => name !== path)));
}

describe('the icon sync against a brand repository that has the mark', () => {
  it('copies every named asset into the path this site serves it from', () => {
    const run = sync();
    assert.equal(run.status, 0, run.output);
    for (const icon of FIXED) {
      assert.equal(read(run.out, icon.to), icon.body, icon.from);
    }
  });

  it('leaves the maskable icons upstream, because this site ships no web app manifest', () => {
    const files = brand({ ...ASSETS, 'assets/icon-maskable-512.png': 'the adaptive mark' });
    const run = sync(files);
    assert.equal(run.status, 0, run.output);
    assert.ok(!existsSync(join(run.out, 'public/icons/icon-maskable-512.png')));
  });

  it('prunes a file under public/icons/ that the manifest no longer names', () => {
    const out = scratch('icons-out');
    put(out, 'public/icons/icon-maskable-512.png', 'a mark nothing declares');
    const run = sync(brand(), out);
    assert.equal(run.status, 0, run.output);
    assert.ok(!existsSync(join(out, 'public/icons/icon-maskable-512.png')));
    assert.match(run.output, /pruned .*icon-maskable-512\.png/);
  });

  it('writes the same bytes when it runs twice', () => {
    const out = scratch('icons-out');
    assert.equal(sync(brand(), out).status, 0);
    const first = read(out, 'public/icons/icon-512.png');
    assert.equal(sync(brand(), out).status, 0);
    assert.equal(read(out, 'public/icons/icon-512.png'), first);
  });
});

describe('the icon sync against a brand repository that has lost a file', () => {
  it('fails, naming the file it could not find', () => {
    const run = sync(without('assets/icon-512.png'));
    assert.notEqual(run.status, 0);
    assert.match(run.output, /assets\/icon-512\.png/);
  });

  it('fails when the manifest itself is missing', () => {
    const run = sync(ASSETS);
    assert.notEqual(run.status, 0);
    assert.match(run.output, /assets\/MANIFEST\.json/);
  });

  it('leaves the icons already on disk exactly where they were', () => {
    const out = scratch('icons-out');
    put(out, 'public/icons/icon-512.png', 'the mark the site is serving today');
    const run = sync(without('assets/apple-touch-icon.png'), out);
    assert.notEqual(run.status, 0);
    assert.equal(read(out, 'public/icons/icon-512.png'), 'the mark the site is serving today');
  });
});

describe('the icon sync against a brand repository whose assets were hand edited', () => {
  it('fails, naming every asset whose bytes are not the sha256 the manifest publishes', () => {
    const run = sync(brand(ASSETS, { 'assets/icon-192.png': 'what the mark used to be' }));
    assert.notEqual(run.status, 0);
    assert.match(run.output, /icon-192\.png/);
    assert.match(run.output, /MANIFEST\.json/);
  });

  it('copies nothing at all, so the icons the site serves are untouched', () => {
    const out = scratch('icons-out');
    put(out, 'public/icons/icon-512.png', 'the mark the site is serving today');
    const run = sync(brand(ASSETS, { 'assets/favicon.ico': 'a favicon nobody shipped' }), out);
    assert.notEqual(run.status, 0);
    assert.equal(read(out, 'public/icons/icon-512.png'), 'the mark the site is serving today');
    assert.ok(!existsSync(join(out, 'public/favicon.ico')));
    assert.ok(!existsSync(join(out, 'public/icons/apple-touch-icon.png')));
  });
});
