/**
 * The stack pages' manifest: what an address resolves to, and what happens when it stops resolving.
 *
 * The second half is the point of the whole thing. `/`, `/app`, `/sync` and `/inference` quote
 * headings and paragraphs out of three other repositories, and any of them gets reworded upstream
 * by somebody who has never seen this site. That has to break the sync loudly, with the file named,
 * rather than quietly emptying a section on the front page. So it is tested the way the other
 * refusals are: by running the program.
 */
import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';

import type { Block, DocFile } from '../../app/lib/docs';
import {
  STACK_PAGES,
  STACK_SECTIONS,
  type DocumentSource,
  type SectionAddress,
  type SectionSource,
  sectionBlocks,
} from '../../app/lib/stack-sections';
import { disposeScratches, manifestFiles, sync } from './lib/sync-fixtures';

after(disposeScratches);

function paragraph(text: string): Block {
  return { kind: 'paragraph', spans: [{ kind: 'text', text }] };
}

function heading(level: number, text: string): Block {
  return { kind: 'heading', level, text, id: text, spans: [{ kind: 'text', text }] };
}

/** A document with a lead, one section, a subsection inside it, and a second section after. */
function doc(): DocFile {
  return {
    component: 'app',
    slug: 'architecture',
    file: 'docs/architecture.md',
    title: 'Architecture',
    blocks: [
      paragraph('The lead.'),
      paragraph('Still the lead.'),
      heading(2, 'What it holds'),
      paragraph('It holds this.'),
      heading(3, 'History'),
      paragraph('It used to hold that.'),
      heading(2, 'What it sends'),
      paragraph('It sends this.'),
    ],
  };
}

/** A README lead with a drawing between its two paragraphs, which is the shape that forced a rule. */
function readmeLead(): Block[] {
  return [
    paragraph('What this repository is.'),
    { kind: 'code', lang: '', text: 'phone ---> service' },
    paragraph('A second paragraph nobody asked for.'),
  ];
}

function source(page: DocFile, readme: Block[]): DocumentSource {
  return {
    page: (component, slug) => (component === page.component && slug === page.slug ? page : null),
    readme: () => readme,
  };
}

function address(from: SectionSource): SectionAddress {
  return { id: 'under-test', component: 'app', from, headingKey: 'pages.home.whatItIs.heading' };
}

/** Each block as its kind, with a heading naming itself, so an assertion reads as the section does. */
function kinds(blocks: Block[] | null): string[] {
  return (blocks ?? []).map((block) => (block.kind === 'heading' ? `[h${block.level}] ${block.text}` : block.kind));
}

function resolve(from: SectionSource): Block[] | null {
  return sectionBlocks(address(from), source(doc(), readmeLead()));
}

describe('an address that names a heading', () => {
  it('takes every block under it, up to the next heading at that level', () => {
    assert.deepEqual(kinds(resolve({ kind: 'doc', slug: 'architecture', heading: 'What it sends' })), ['paragraph']);
  });

  it('keeps a deeper heading, because a subsection is part of its section', () => {
    assert.deepEqual(kinds(resolve({ kind: 'doc', slug: 'architecture', heading: 'What it holds' })), [
      'paragraph',
      '[h3] History',
      'paragraph',
    ]);
  });

  it('is null when no heading says that any more', () => {
    assert.equal(resolve({ kind: 'doc', slug: 'architecture', heading: 'What it holds, reworded' }), null);
  });

  it('is null when the component no longer publishes that page', () => {
    assert.equal(resolve({ kind: 'doc', slug: 'gone', heading: 'What it holds' }), null);
  });
});

describe('an address that names a document lead', () => {
  it('is every block before the first heading', () => {
    assert.deepEqual(kinds(resolve({ kind: 'doc-lead', slug: 'architecture' })), ['paragraph', 'paragraph']);
  });

  it('is null for a document that opens on a heading, because there is no lead to show', () => {
    const opener = doc();
    opener.blocks = opener.blocks.slice(2);
    assert.equal(sectionBlocks(address({ kind: 'doc-lead', slug: 'architecture' }), source(opener, [])), null);
  });
});

describe('an address that names a README lead', () => {
  it('takes one paragraph by default, which is what a card holds', () => {
    const blocks = resolve({ kind: 'readme', paragraphs: 1 }) ?? [];
    assert.equal(blocks.length, 1);
    assert.equal(blocks[0]?.kind, 'paragraph');
  });

  it('counts paragraphs and not blocks, so a drawing in the lead is stepped over', () => {
    // openplate-inference's README runs its lead straight into an ASCII drawing of the request
    // path. Counting blocks would put that drawing on the front page as the second thing said.
    assert.deepEqual(kinds(resolve({ kind: 'readme', paragraphs: 2 })), ['paragraph', 'paragraph']);
  });

  it('is null when the README holds fewer paragraphs than the page asks for', () => {
    assert.equal(resolve({ kind: 'readme', paragraphs: 3 }), null);
  });
});

describe('the manifest itself', () => {
  it('gives every section an id its page can ask for, unique within that page', () => {
    for (const page of STACK_PAGES) {
      const ids = STACK_SECTIONS[page].map((entry) => entry.id);
      assert.equal(new Set(ids).size, ids.length, `${page} has two sections with one id`);
    }
  });

  it('asks a README for one paragraph, because the second one is a decision and not a default', () => {
    for (const page of STACK_PAGES) {
      for (const entry of STACK_SECTIONS[page]) {
        if (entry.from.kind !== 'readme') continue;
        assert.equal(entry.from.paragraphs, 1, `${page}/${entry.id} takes more than the opening paragraph`);
      }
    }
  });
});

describe('the sync, against repositories that no longer hold what the pages quote', () => {
  it('fails, naming the component and the heading, when a heading is reworded', () => {
    const gone = 'The client is the product';
    const run = sync({ app: manifestFiles('app', gone) });
    assert.notEqual(run.status, 0, run.output);
    assert.match(run.output, new RegExp(gone));
    assert.match(run.output, /architecture/);
  });

  it('fails, naming the README, when a repository loses the paragraph under its title', () => {
    const app = manifestFiles('app');
    app['README.md'] = (app['README.md'] ?? '').replace('The repository, in one sentence.', '');
    const run = sync({ app });
    assert.notEqual(run.status, 0, run.output);
    assert.match(run.output, /README\.md/);
  });

  it('passes when every address is where the manifest says it is', () => {
    const run = sync();
    assert.equal(run.status, 0, run.output);
    assert.match(run.output, /every section the stack pages quote resolved/);
  });
});
