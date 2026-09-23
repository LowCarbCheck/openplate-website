/**
 * No committed source file carries a raw U+0000 byte.
 *
 * M229 found two of them sitting in `scripts/lib/translate-ui.ts`, inside a
 * `.join('...')` that was meant to read `'\u0000'`, the six-character escape.
 * Nothing in the gate saw them: the file compiled, the tests passed, and the
 * only tell was `file` calling the module "data" and `git diff --stat`
 * reporting "Bin" on every unrelated edit to it. This is the check that was
 * missing, over every tracked TypeScript, JSON and CSS file, the same set the
 * spec's own `git grep -P '\x00'` line covers.
 *
 * ── WHY THE FILE LIST COMES FROM GIT ──
 * `git ls-files` names exactly what a push would carry. A walk of the working
 * tree would also read `build/`, `node_modules/` and `.react-router/`, none of
 * which is committed, and a binary under one of those would fail a check about
 * the repository with a message about a file nobody wrote.
 *
 * ── WHAT THE NEXT COMMIT CARRIES, NOT WHAT THE INDEX HOLDS ──
 * `git ls-files` alone lists the INDEX, and the docs workflow runs this tier
 * between the sync and its commit. openplate 0.41.0 removed a document
 * upstream, the sync deleted its generated module from the working tree, the
 * index still named it, and this test died on ENOENT (run 35842962091). The
 * same gap hid the other half: a module the sync had just CREATED was
 * untracked, so it was never read at all. The list is therefore the files that
 * are in the working tree and not ignored, tracked or new, which is exactly
 * what a `git add` of the tree would commit. A deleted file carries no bytes
 * into the commit, so leaving it out loses nothing.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');

/** Does this text carry a raw NUL? Written as a code point so the test file itself never holds one. */
function carriesNul(text: string): boolean {
  return text.includes(String.fromCodePoint(0));
}

const SOURCE_PATTERNS = ['*.ts', '*.tsx', '*.json', '*.css'];

function gitList(root: string, flags: string[]): string[] {
  return execFileSync('git', ['ls-files', ...flags, '--', ...SOURCE_PATTERNS], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((file) => file !== '');
}

/** The sources a commit of `root`'s working tree would carry: tracked or new, present, not ignored. */
function committableSources(root: string): string[] {
  const deleted = new Set(gitList(root, ['--deleted']));
  const present = gitList(root, ['--cached', '--others', '--exclude-standard']).filter((file) => !deleted.has(file));
  return [...new Set(present)];
}

describe('the committed sources', () => {
  it('carry no raw NUL byte in any committable .ts, .tsx, .json or .css file', () => {
    const files = committableSources(ROOT);
    // ASSERTED NON-EMPTY, so an empty list from a broken `git` invocation
    // cannot pass as "nothing carries a NUL".
    assert.ok(files.length > 100, `only ${files.length} source files were listed`);
    const offenders = files.filter((file) => carriesNul(readFileSync(resolve(ROOT, file), 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('CONTROL: the list reads a new file and skips a tracked one deleted from the tree', () => {
    const root = mkdtempSync(join(tmpdir(), 'no-nul-'));
    try {
      execFileSync('git', ['init', '-q'], { cwd: root });
      writeFileSync(join(root, 'removed.ts'), 'export {};\n');
      writeFileSync(join(root, 'kept.ts'), 'export {};\n');
      execFileSync('git', ['add', 'removed.ts', 'kept.ts'], { cwd: root });
      unlinkSync(join(root, 'removed.ts'));
      writeFileSync(join(root, 'new.ts'), `a${String.fromCodePoint(0)}b`);
      writeFileSync(join(root, '.gitignore'), 'ignored.ts\n');
      writeFileSync(join(root, 'ignored.ts'), 'export {};\n');

      const files = committableSources(root);
      assert.deepEqual(files.toSorted(), ['kept.ts', 'new.ts']);
      // The new file is read, so a NUL in something the sync just wrote is caught before its commit.
      assert.deepEqual(
        files.filter((file) => carriesNul(readFileSync(join(root, file), 'utf8'))),
        ['new.ts'],
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('CONTROL: the predicate sees a raw NUL and does not see its escape', () => {
    assert.equal(carriesNul(`a${String.fromCodePoint(0)}b`), true);
    // The six characters `\u0000` as source text, which is what the fixed
    // library line holds and what this check must not flag.
    assert.equal(carriesNul('a\\u0000b'), false);
  });
});
