/**
 * Which paths of a source repository count as documentation.
 *
 * The site quotes each source at its highest release tag, because the default branch can document
 * code that is not released and publishing that makes the site lie. The exception, added because a
 * typo fix in `docs/` should not need a version bump, is that a documentation file is read from the
 * branch when every commit that touched it since the tag touched documentation and nothing else.
 * `documentationOnly` is the predicate that answers "and nothing else", so it is a pure function
 * over one commit's paths and it is tested hardest here: a path it wrongly calls documentation
 * publishes a page about a program nobody can run.
 *
 * The per-file rule built on top of it is driven against real repositories in
 * `released-mixed-diff.test.ts`.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { documentationOnly } from '../../scripts/lib/clone';

describe('documentationOnly', () => {
  it('takes a guide under docs/', () => {
    assert.equal(documentationOnly(['docs/architecture.md']), true);
  });

  it('takes the README, which is the manifest and the lead this site quotes', () => {
    assert.equal(documentationOnly(['README.md']), true);
  });

  it('takes the CHANGELOG, which is the release notes page', () => {
    assert.equal(documentationOnly(['CHANGELOG.md']), true);
  });

  it('takes several documents at once', () => {
    assert.equal(documentationOnly(['README.md', 'CHANGELOG.md', 'docs/protocol.md', 'docs/images/a.png']), true);
  });

  it('refuses a manifest change, because a dependency is code', () => {
    assert.equal(documentationOnly(['package.json']), false);
  });

  it('refuses a source file', () => {
    assert.equal(documentationOnly(['app/lib/brand.ts']), false);
  });

  it('refuses documentation and code together, which is the ordinary release', () => {
    assert.equal(documentationOnly(['docs/architecture.md', 'app/lib/brand.ts']), false);
  });

  it('refuses an empty list, because a commit this walk cannot see is no evidence', () => {
    assert.equal(documentationOnly([]), false);
  });

  /**
   * THE ONE A SLOPPY `includes('docs/')` GETS WRONG. `app/docs/thing.ts` is application code in a
   * directory that happens to be called docs, the sync never reads it, and calling it documentation
   * would publish a branch whose program has changed.
   */
  it('refuses a path that merely contains docs/ deeper in it', () => {
    assert.equal(documentationOnly(['app/docs/thing.ts']), false);
  });

  it('refuses a file called docs with no slash after it', () => {
    assert.equal(documentationOnly(['docs']), false);
  });

  it('refuses a README that is not the repository root one', () => {
    assert.equal(documentationOnly(['app/README.md']), false);
  });
});
