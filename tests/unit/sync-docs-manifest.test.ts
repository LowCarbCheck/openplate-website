/**
 * The manifest checks, against fixture repositories on disk.
 *
 * The harness, and the fixture documents the four stack pages need, live in
 * `lib/sync-fixtures.ts`, which says why the sync runs as a child process and
 * why the fixture documents are generated from the manifest rather than typed
 * out. This file is the list of things the sync must refuse.
 */
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import { GUIDE, ROW, disposeScratches, manifestFixture, readme, sync } from './lib/sync-fixtures';

after(disposeScratches);

/** One page each component publishes for the stack pages, and so one module the sync must write. */
const PAGES = { app: 'architecture', sync: 'protocol', inference: 'privacy' };

describe('the sync against a manifest that agrees with the tree', () => {
  it('writes a module per page, an index, release notes and SOURCE.json', () => {
    const run = sync();
    assert.equal(run.status, 0, run.output);
    for (const [component, slug] of Object.entries(PAGES)) {
      assert.ok(existsSync(join(run.out, 'src/generated/docs', component, `${slug}.ts`)), `${component} page`);
      assert.ok(existsSync(join(run.out, 'src/generated/releases', `${component}.ts`)), `${component} releases`);
    }
    assert.ok(existsSync(join(run.out, 'src/generated/docs-index.ts')));
    assert.ok(existsSync(join(run.out, 'src/generated/SOURCE.json')));
    assert.ok(existsSync(join(run.out, 'public/SOURCE.json')));
  });
});

describe('the sync against a manifest that has drifted', () => {
  it('refuses a documentation table row whose file is not in the tree', () => {
    const run = sync({ app: { 'README.md': readme([ROW]) } });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /docs\/sync\.md/);
  });

  it('refuses a docs file that no table row mentions', () => {
    const run = sync({
      app: { 'README.md': readme([ROW]), 'docs/sync.md': GUIDE, 'docs/orphan.md': '# Orphan\n' },
    });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /disagree/);
    assert.match(run.output, /docs\/orphan\.md/);
  });

  it('refuses a page with no `# ` title', () => {
    const run = sync({ app: { 'README.md': readme([ROW]), 'docs/sync.md': 'No title here.\n' } });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /has no `# ` title/);
  });

  it('refuses an image that is not under docs/images/', () => {
    const run = sync({
      app: {
        'README.md': readme([ROW]),
        'docs/sync.md': '# Sync\n\n![A diagram](../assets/diagram.png)\n',
      },
    });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /assets\/diagram\.png/);
    assert.match(run.output, /docs\/images/);
  });

  it('refuses a README with no Documentation section at all', () => {
    const run = sync({ app: { 'README.md': '# A repository\n\nNothing.\n', 'docs/sync.md': GUIDE } });
    assert.notEqual(run.status, 0);
    assert.match(run.output, /Documentation section/);
  });

  it('excludes docs/README.md and the ADRs from the drift check', () => {
    const app = manifestFixture('app');
    const run = sync({
      app: {
        ...app.files,
        'README.md': readme([...app.rows, ROW]),
        'docs/sync.md': GUIDE,
        'docs/README.md': '# Index\n',
        'docs/adr/0001-a-decision.md': '# A decision\n',
      },
    });
    assert.equal(run.status, 0, run.output);
  });
});
