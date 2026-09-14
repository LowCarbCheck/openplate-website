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
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');

/** Does this text carry a raw NUL? Written as a code point so the test file itself never holds one. */
function carriesNul(text: string): boolean {
  return text.includes(String.fromCodePoint(0));
}

function trackedSources(): string[] {
  return execFileSync('git', ['ls-files', '--', '*.ts', '*.tsx', '*.json', '*.css'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((file) => file !== '');
}

describe('the committed sources', () => {
  it('carry no raw NUL byte in any tracked .ts, .tsx, .json or .css file', () => {
    const files = trackedSources();
    // ASSERTED NON-EMPTY, so an empty list from a broken `git` invocation
    // cannot pass as "nothing carries a NUL".
    assert.ok(files.length > 100, `only ${files.length} tracked source files were listed`);
    const offenders = files.filter((file) => carriesNul(readFileSync(resolve(ROOT, file), 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('CONTROL: the predicate sees a raw NUL and does not see its escape', () => {
    assert.equal(carriesNul(`a${String.fromCodePoint(0)}b`), true);
    // The six characters `\u0000` as source text, which is what the fixed
    // library line holds and what this check must not flag.
    assert.equal(carriesNul('a\\u0000b'), false);
  });
});
