/**
 * No legal text of the operator is left in this repository (M246).
 *
 * The imprint and the privacy notice moved to the app, which renders them from files mounted into
 * its container, so that the prose and the register data live in a private repository and nowhere
 * public. A copy that survives here, in a locale bundle, a translation memory, a generated document
 * or a comment, undoes that, and it builds, tests and renders perfectly. This is the check.
 *
 * ── WHY THE SENTINELS ARE HASHES ──
 * A list of the strings themselves would put the text this test forbids into the tree it guards,
 * and the umbrella's sweep (`scripts/legal-sentinels.sh`, spec M246/06) would then find it here.
 * So each sentinel is its SHA-256, its length and a short, harmless prefix: the scan finds every
 * place the prefix occurs and hashes the text of the sentinel's length that starts there. The
 * prefixes name nothing on their own; the hashes are what match. To add a sentinel, hash the exact
 * string (`printf %s '<text>' | sha256sum`) and take its first few words as the prefix.
 *
 * The list covers what this site itself carried: the operator block of its imprint, one sentence
 * of its privacy notice per language (as the site had it and as the app now serves it, where the
 * two differ), and the legal review record the documentation sync used to quote. The umbrella's
 * sweep covers the documents of the other repositories.
 *
 * ── WHICH FILES ──
 * The ones a commit of the working tree would carry, the same set and for the same reason as
 * `tests/unit/no-nul-bytes.test.ts`: a copy in a file nobody has added yet is still on its way to
 * a push.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');

interface Sentinel {
  label: string;
  prefix: string;
  length: number;
  sha256: string;
}

const SENTINELS: readonly Sentinel[] = [
  {
    label: 'the VAT id',
    prefix: 'DE3',
    length: 11,
    sha256: '14fc2ff397bcddc41af484a1bf7aef9340fb704868d3641bde543327cec1648f',
  },
  {
    label: 'the register number',
    prefix: 'HRB 1',
    length: 10,
    sha256: '1c240269b30c24fb8ec09044d78066b7b1d68ae1561be1562bcbabdab51742e2',
  },
  {
    label: 'the register court',
    prefix: 'Amtsgericht ',
    length: 26,
    sha256: '7608a6eea0aa5c8e30359934ea9e6053478ceecffe7e9d6f3d204f93ec1dab17',
  },
  {
    label: 'the street',
    prefix: 'Straße ',
    length: 12,
    sha256: 'b0e506b9842a14fa650116c9eee80e9a355e5b2667e5245f4cf8810418e7d6b7',
  },
  {
    label: 'the legal name',
    prefix: 'SPA',
    length: 17,
    sha256: 'e1da52cebd64906eaf166b95f95d3219f00169ca589f834eaebbae6ce0693cf9',
  },
  {
    label: 'the statutory button word',
    prefix: 'zahlungs',
    length: 17,
    sha256: '5ff7ae22d4ee4484492aff64720bfa0749aedede2d92363ef91ec0a22b522a49',
  },
  {
    label: 'the privacy notice, en',
    prefix: 'There are ',
    length: 41,
    sha256: '3b98e22c149a73d696eae8d2f112dbbdd465827cbebc62ca536e7733e7b89338',
  },
  {
    label: 'the privacy notice, de',
    prefix: 'Auf dieser ',
    length: 46,
    sha256: '9d90156275001f7c7cb08143a1351147b3eb6dc3c9279b55f9f454121a7acde5',
  },
  {
    label: 'the privacy notice, fr',
    prefix: 'Il n',
    length: 42,
    sha256: '8e2165277134a5b25c588abe6f889cb71ea705f0f2c18b75abbdca1739d56caf',
  },
  {
    label: 'the privacy notice, fr, as the app serves it',
    prefix: 'Ce site ',
    length: 35,
    sha256: 'c4d937635b53dd1c78c7535963233884d4cb8add09dd2c50aaf8207b79264c87',
  },
  {
    label: 'the privacy notice, it',
    prefix: 'Su questo ',
    length: 40,
    sha256: '8a84c4426b269863ab12cfb9b64697a7dce0cd058c2196d5cf12f1216e507de7',
  },
  {
    label: 'the privacy notice, es',
    prefix: 'No hay ',
    length: 38,
    sha256: '5e0c4079382dad24bae2b7d8eabc538742107a40f3f79163f2e88037b5c38850',
  },
  {
    label: 'the privacy notice, es, as the app serves it',
    prefix: 'En este ',
    length: 32,
    sha256: 'c43aa26071f63bf9085b6a860df0ee2c95e76aaf6725984d9b2456e002235388',
  },
  {
    label: 'the privacy notice, tr',
    prefix: 'Bu sitenin ',
    length: 43,
    sha256: 'f5caafe071d6cf023c90f6c91d472ed31e1fe51d11e160031736305b37a4176c',
  },
  {
    label: 'the privacy notice, tr, as the app serves it',
    prefix: 'Bu sitenin ',
    length: 36,
    sha256: 'c485a8e727ec4513af8bc1854c09f86848061350e06f5fbb960fa8ea4f988290',
  },
  {
    label: 'the legal review record',
    prefix: 'machine translations ',
    length: 44,
    sha256: '82ffb877e3169491022e7cb42fe4f9caf8721182afe31fb13d9e79e8c9a3d527',
  },
];

/** Pictures and fonts: no sentence of prose can be found in them as text. */
const BINARY = /\.(?:png|webp|ico|woff2|jpg|jpeg|gif)$/;

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Every sentinel `text` carries, by label. The prefix finds the candidates, the hash decides. */
function sentinelsIn(text: string, sentinels: readonly Sentinel[]): string[] {
  return sentinels
    .filter((sentinel) => {
      for (let at = text.indexOf(sentinel.prefix); at !== -1; at = text.indexOf(sentinel.prefix, at + 1)) {
        if (sha256(text.slice(at, at + sentinel.length)) === sentinel.sha256) return true;
      }
      return false;
    })
    .map((sentinel) => sentinel.label);
}

/** The files a commit of the working tree would carry: tracked or new, present, not ignored. */
function committableFiles(): string[] {
  const list = (flags: string[]): string[] =>
    execFileSync('git', ['ls-files', ...flags], { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter((file) => file !== '');
  const deleted = new Set(list(['--deleted']));
  const present = list(['--cached', '--others', '--exclude-standard']).filter((file) => !deleted.has(file));
  return [...new Set(present)].filter((file) => !BINARY.test(file));
}

describe('the legal sentinels', () => {
  it('occur in no file of the tree', () => {
    const files = committableFiles();
    // A broken `git` call lists nothing, and nothing carries no sentinel.
    assert.ok(files.length > 100, `only ${files.length} files were listed`);
    const hits = files.flatMap((file) =>
      sentinelsIn(readFileSync(resolve(ROOT, file), 'utf8'), SENTINELS).map((label) => `${file}: ${label}`),
    );
    assert.deepEqual(hits, []);
  });

  it('are each a distinct hash of a string as long as it says', () => {
    assert.equal(new Set(SENTINELS.map((sentinel) => sentinel.sha256)).size, SENTINELS.length);
    for (const sentinel of SENTINELS) {
      assert.match(sentinel.sha256, /^[0-9a-f]{64}$/, sentinel.label);
      assert.ok(sentinel.prefix.length > 0 && sentinel.prefix.length < sentinel.length, sentinel.label);
    }
  });

  it('CONTROL: the scan finds a sentinel mid-line, in JSON, and past a first false start', () => {
    const planted = 'control sentinel for the legal sweep';
    const control: Sentinel = { label: 'control', prefix: 'control ', length: planted.length, sha256: sha256(planted) };
    assert.deepEqual(sentinelsIn(`"body": "a control word, then the ${planted}."`, [control]), ['control']);
    assert.deepEqual(sentinelsIn('control sentinel for the legal review', [control]), []);
  });
});
