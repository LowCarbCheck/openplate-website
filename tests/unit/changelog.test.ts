/**
 * A CHANGELOG becomes the `/releases/<component>` page, so the two spellings of
 * a release heading in use across these repositories both have to be read, and
 * a heading that is not a release must not become an empty release.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { spansText } from '../../app/lib/docs';
import { parseChangelog } from '../../scripts/lib/changelog';
import type { LinkBase } from '../../scripts/lib/markdown';

const BASE: LinkBase = { repo: 'https://github.com/LowCarbCheck/openplate', sha: 'abc123', dir: '' };

const CHANGELOG = `# Changelog

All notable changes are recorded here.

## 0.10.1 - 2026-09-04

- You stay signed in when you open the app again.

## [0.9.0] - 2026-08-30

### BREAKING

- The field is called \`email\` again.

## 0.8.3 and earlier

Older entries live in the git history.
`;

describe('parseChangelog', () => {
  it('reads both heading spellings, newest first', () => {
    const { releases } = parseChangelog(CHANGELOG, BASE);
    assert.deepEqual(
      releases.map((release) => release.version),
      ['0.10.1', '0.9.0'],
    );
    assert.equal(releases[0]?.date, '2026-09-04');
    assert.equal(releases[1]?.date, '2026-08-30');
  });

  it('parses a release body into blocks, headings and all', () => {
    const { releases } = parseChangelog(CHANGELOG, BASE);
    const kinds = releases[1]?.blocks.map((block) => block.kind) ?? [];
    assert.deepEqual(kinds, ['heading', 'list']);
  });

  it('reports a heading that is not a release instead of publishing it empty', () => {
    const { releases, skipped } = parseChangelog(CHANGELOG, BASE);
    assert.equal(releases.length, 2);
    assert.deepEqual(skipped, ['0.8.3 and earlier']);
  });

  it('orders releases itself rather than trusting the file', () => {
    const outOfOrder = '## 1.0.0 - 2026-01-01\n\n- old\n\n## 1.2.0 - 2026-02-01\n\n- new\n';
    const { releases } = parseChangelog(outOfOrder, BASE);
    assert.deepEqual(
      releases.map((release) => release.version),
      ['1.2.0', '1.0.0'],
    );
  });

  it('reads a changelog with no releases as an empty page, not as a failure', () => {
    const { releases, skipped } = parseChangelog('# Changelog\n\nNothing yet.\n', BASE);
    assert.deepEqual(releases, []);
    assert.deepEqual(skipped, []);
  });

  it('resolves a link in a release body the way a doc page does', () => {
    const { releases } = parseChangelog('## 1.0.0 - 2026-01-01\n\nSee [the compose file](docker/compose.yml).\n', BASE);
    const block = releases[0]?.blocks[0];
    assert.equal(block?.kind, 'paragraph');
    if (block?.kind !== 'paragraph') return;
    assert.equal(spansText(block.spans), 'See the compose file.');
    const link = block.spans.find((span) => span.kind === 'link');
    assert.equal(
      link?.kind === 'link' ? link.href : '',
      'https://github.com/LowCarbCheck/openplate/blob/abc123/docker/compose.yml',
    );
  });
});
