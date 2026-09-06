/**
 * The screenshot sync, against a fixture application repository on disk.
 *
 * Run as a CHILD PROCESS, like the documentation and icon syncs and for the same reason: the
 * refusal IS the exit code and the line the script prints, so an extracted predicate would test a
 * predicate rather than the program. The fixture files are short strings and not real WebP, because
 * every claim here is about which bytes ended up at which path, and a WebP header would only make
 * the fixture harder to read.
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
import { SHOT_LOCALES, SHOT_VIEWS, shotManifest } from '../../app/lib/shots';

after(disposeScratches);

const SCRIPT = resolve(import.meta.dirname, '../../scripts/sync-shots.ts');

/**
 * The fixture repository: every file the manifest names, upstream where the capture script writes
 * it, carrying its own path as its body so a copy that lands in the wrong place is visible.
 *
 * BUILT FROM THE MANIFEST rather than typed out. A view added to `SHOT_VIEWS` is then a view this
 * fixture holds, so these tests keep testing the sync instead of failing for a reason none of them
 * is about, which is the lesson `sync-fixtures.ts` already learned once.
 */
function upstream(): RepoFiles {
  const files: Record<string, string> = {};
  for (const target of shotManifest()) files[target.replace('shots/', 'public/landing/')] = target;
  return files;
}

interface Run {
  status: number;
  output: string;
  /** The working directory the sync wrote into, which is where `public/` is. */
  out: string;
}

function sync(files: RepoFiles = upstream(), out = scratch('shots-out')): Run {
  const source = repo('shots-app', files);
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

/** The upstream fixture with one capture taken away, which is the only way this sync can fail. */
function without(path: string): RepoFiles {
  const files = upstream();
  assert.ok(path in files, `${path} is not in the fixture, so removing it proves nothing`);
  return Object.fromEntries(Object.entries(files).filter(([name]) => name !== path));
}

describe('the screenshot manifest', () => {
  it('names every view in both languages, in both appearances', () => {
    const files = shotManifest();
    for (const locale of SHOT_LOCALES) {
      for (const view of SHOT_VIEWS) {
        assert.ok(files.includes(`shots/${locale}/${view}-mobile-light.webp`), `${locale}/${view} light`);
        assert.ok(files.includes(`shots/${locale}/${view}-mobile-dark.webp`), `${locale}/${view} dark`);
      }
      // The hero's desktop capture, at both widths, which no `SHOT_VIEWS` entry covers.
      assert.ok(files.includes(`shots/${locale}/diary-desktop-light-1080.webp`));
      assert.ok(files.includes(`shots/${locale}/diary-desktop-light.webp`));
    }
  });

  it('does not name the sync screen, which is captured upstream and deliberately not shown here', () => {
    // The reasoning lives in `app/lib/shots.ts`: `/settings/sync` has redirected to
    // `/settings/account` since M192, so signed out that capture says only that you are signed out.
    // This case exists so that copying it becomes a DECISION somebody makes and not an accident.
    assert.ok(!shotManifest().some((file) => file.includes('sync-mobile')));
  });
});

describe('the screenshot sync against an application that has the captures', () => {
  it('copies every named file into public/shots, bytes and all', () => {
    const run = sync();
    assert.equal(run.status, 0, run.output);
    for (const target of shotManifest()) assert.equal(read(run.out, `public/${target}`), target, target);
  });

  it('walks past the sync capture that exists upstream', () => {
    const files = upstream();
    files['public/landing/de/sync-mobile-light.webp'] = 'the signed-out settings card';
    const run = sync(files);
    assert.equal(run.status, 0, run.output);
    assert.ok(!existsSync(join(run.out, 'public/shots/de/sync-mobile-light.webp')));
  });

  it('prunes a file under public/shots/ that the manifest no longer names', () => {
    const out = scratch('shots-out');
    put(out, 'public/shots/de/fasting-mobile-light.webp', 'a screen nothing declares');
    const run = sync(upstream(), out);
    assert.equal(run.status, 0, run.output);
    assert.ok(!existsSync(join(out, 'public/shots/de/fasting-mobile-light.webp')));
    assert.match(run.output, /pruned .*fasting-mobile-light\.webp/);
  });

  it('writes the same bytes when it runs twice', () => {
    const out = scratch('shots-out');
    assert.equal(sync(upstream(), out).status, 0);
    const first = read(out, 'public/shots/de/diary-mobile-light.webp');
    assert.equal(sync(upstream(), out).status, 0);
    assert.equal(read(out, 'public/shots/de/diary-mobile-light.webp'), first);
  });
});

describe('the screenshot sync against an application that is missing a capture', () => {
  it('fails, naming the file it could not find', () => {
    const run = sync(without('public/landing/de/goals-mobile-dark.webp'));
    assert.notEqual(run.status, 0);
    assert.match(run.output, /public\/landing\/de\/goals-mobile-dark\.webp/);
  });

  it('names every missing file at once, not the first one', () => {
    const files = upstream();
    delete files['public/landing/de/goals-mobile-dark.webp'];
    delete files['public/landing/en/scan-mobile-light.webp'];
    const run = sync(files);
    assert.notEqual(run.status, 0);
    assert.match(run.output, /goals-mobile-dark\.webp/);
    assert.match(run.output, /scan-mobile-light\.webp/);
  });

  it('leaves a hole in no language, keeping the shots already on disk', () => {
    // The point of failing before the first write. A half-copied `public/shots/` is a landing page
    // with gaps in it, and a reader cannot tell that from a site that is broken.
    const out = scratch('shots-out');
    put(out, 'public/shots/de/diary-mobile-light.webp', 'the capture the site is serving today');
    const run = sync(without('public/landing/en/add-mobile-light.webp'), out);
    assert.notEqual(run.status, 0);
    assert.equal(read(out, 'public/shots/de/diary-mobile-light.webp'), 'the capture the site is serving today');
  });
});
