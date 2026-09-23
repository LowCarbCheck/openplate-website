/**
 * The documentation nav's grouping: every component in one rail, titles only,
 * and exactly one row marked.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { docsNavGroups, type DocsNavGroup } from '../../app/lib/docs-nav';
import { DOC_COMPONENTS, type ComponentDocs, type DocComponent, type DocsIndex } from '../../app/lib/docs';

function table(component: DocComponent, slugs: string[]): ComponentDocs {
  return {
    component,
    source: { repo: 'https://example.test', ref: 'v1.0.0', editRef: 'main', sha: 'abc', committedAt: '2026-09-01' },
    lead: [],
    entries: slugs.map((slug) => ({
      slug,
      file: `docs/${slug}.md`,
      title: `${component} ${slug}`,
      blurb: [{ kind: 'text', text: `about ${slug}` }],
    })),
  };
}

const INDEX: DocsIndex = {
  app: table('app', ['architecture', 'configuration']),
  core: table('core', ['protocol']),
  inference: table('inference', ['configuration', 'runtimes']),
};

function marked(groups: DocsNavGroup[]): string[] {
  return groups.flatMap((group) => group.rows.filter((row) => row.isCurrent).map((row) => row.to));
}

describe('docsNavGroups', () => {
  it('lists every component in order, each with its rows and then its release notes', () => {
    const groups = docsNavGroups({ index: INDEX });
    assert.deepEqual(
      groups.map((group) => group.component),
      [...DOC_COMPONENTS],
    );
    assert.deepEqual(
      groups[0]?.rows.map((row) => row.to),
      ['/docs/app/architecture', '/docs/app/configuration', '/releases/app'],
    );
    assert.equal(groups[2]?.rows.at(-1)?.kind, 'releases');
  });

  it('marks the component being read and no other', () => {
    const groups = docsNavGroups({ index: INDEX, place: { kind: 'doc', component: 'core', slug: 'protocol' } });
    assert.deepEqual(
      groups.filter((group) => group.isCurrent).map((group) => group.component),
      ['core'],
    );
  });

  it('gives every row its title and nothing else to print', () => {
    const rows = docsNavGroups({
      index: INDEX,
      place: { kind: 'doc', component: 'app', slug: 'architecture' },
    }).flatMap((group) => group.rows);
    // Control: the index rows carry blurbs, so a row that copied its entry whole would fail here.
    assert.ok(INDEX.app.entries.every((entry) => entry.blurb.length > 0));
    assert.ok(rows.every((row) => !('blurb' in row)));
    assert.equal(rows[0]?.kind === 'doc' ? rows[0].title : null, 'app architecture');
  });

  it('marks nothing on the index, where no component is being read', () => {
    assert.deepEqual(marked(docsNavGroups({ index: INDEX })), []);
    assert.ok(docsNavGroups({ index: INDEX }).every((group) => !group.isCurrent));
  });

  it('marks a shared slug only inside its own component', () => {
    // Control: `configuration` exists in app AND inference. Matching by slug
    // alone would mark two rows.
    const groups = docsNavGroups({
      index: INDEX,
      place: { kind: 'doc', component: 'inference', slug: 'configuration' },
    });
    assert.deepEqual(marked(groups), ['/docs/inference/configuration']);
  });

  it('marks the release notes row on a releases page', () => {
    const groups = docsNavGroups({ index: INDEX, place: { kind: 'releases', component: 'app' } });
    assert.deepEqual(marked(groups), ['/releases/app']);
  });
});
