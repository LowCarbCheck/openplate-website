/**
 * Every drawing a document asks for is on disk, in every language.
 *
 * ── THE ONE FAILURE THE REST OF THE GATE CANNOT SEE ──
 * A diagram is the only block on this site whose content is not in the block
 * tree. The page prints a path, `sync:docs` writes a file, and nothing else
 * connects the two: a rename, a pruning rule that deleted one file too many, or
 * a language added to `SUPPORTED_LANGUAGES` without a re-sync all produce a
 * green build, a green typecheck and a broken picture. The lint, the types and
 * the prerender all pass on a missing image, because a missing image is a
 * runtime fact about a directory.
 *
 * So this reads the generated documents, works out the file names exactly the
 * way `doc-blocks.tsx` does, and looks for them. It counts the pruning too: a
 * file under `public/docs/diagrams/` that no document claims is a committed
 * blob nobody will ever look at again.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { SUPPORTED_LANGUAGES } from '../../app/i18n/language';
import { DOC_COMPONENTS, type Block } from '../../app/lib/docs';
import { DOCS } from '../../src/generated/docs-registry';

/** Addressed from this file, so the test does not depend on the directory the runner started in. */
const DIAGRAMS = fileURLToPath(new URL('../../public/docs/diagrams', import.meta.url));

/** The appearances an SVG cannot switch between by itself, which is why there are two of them. */
const VARIANTS = ['light', 'dark'] as const;

/** Every diagram id in a block tree, list items and all, the same walk `sync-docs.ts` makes. */
function idsOf(blocks: Block[]): string[] {
  return blocks.flatMap((block) => {
    if (block.kind === 'diagram') return [block.id];
    if (block.kind !== 'list') return [];
    return (block.nested ?? []).flatMap((entry) => idsOf(entry.blocks));
  });
}

function claimed(): Map<string, string> {
  const out = new Map<string, string>();
  for (const component of DOC_COMPONENTS) {
    for (const [slug, doc] of Object.entries(DOCS[component])) {
      for (const id of idsOf(doc.blocks)) out.set(id, `${component}/${slug}`);
    }
  }
  return out;
}

describe('the committed diagrams', () => {
  it('has a light copy and a dark copy of every diagram, in every language', () => {
    const documents = claimed();
    assert.ok(documents.size > 0, 'the generated docs draw at least one diagram');

    const files = new Set(readdirSync(DIAGRAMS));
    const missing: string[] = [];
    for (const [id, where] of documents) {
      for (const language of SUPPORTED_LANGUAGES) {
        for (const variant of VARIANTS) {
          const file = `${id}-${language}-${variant}.svg`;
          if (!files.has(file)) missing.push(`${where} draws ${file}, which is not committed`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });

  it('keeps nothing no document draws any more', () => {
    const documents = claimed();
    const wanted = new Set(
      [...documents.keys()].flatMap((id) =>
        SUPPORTED_LANGUAGES.flatMap((language) => VARIANTS.map((variant) => `${id}-${language}-${variant}.svg`)),
      ),
    );
    assert.deepEqual(
      readdirSync(DIAGRAMS).filter((file) => !wanted.has(file)),
      [],
    );
  });

  it('draws the German copy and the English copy differently', () => {
    // THE POINT OF THE WHOLE ARRANGEMENT, asserted on the real corpus rather than
    // on a fixture. Two identical copies would mean the labels were never
    // substituted, which is precisely the state this milestone found the site in
    // and which every check above is perfectly happy with.
    const german = readdirSync(DIAGRAMS).filter((file) => file.endsWith('-de-light.svg'));
    assert.ok(german.length > 0, 'there are German drawings at all');

    const same = german.filter((file) => drawing(file) === drawing(file.replace('-de-', '-en-')));
    // NOT "none of them", because a fence CAN legitimately draw the same in both:
    // a sequence diagram quotes no label, so there is nothing to substitute. The
    // claim is that the corpus as a whole is translated, and today it is all but
    // that one.
    assert.ok(same.length < german.length, `every German drawing is byte identical to its English copy`);
  });
});

/**
 * One committed drawing, with everything that differs BY NAME taken out of it.
 *
 * Two copies of one fence are never byte identical: the stamp carries a hash of
 * the words drawn, and mermaid writes the id it was given into the SVG and into
 * every internal reference in it, so `d00e53e5d9f2e-de-light` is in the bytes
 * dozens of times. Comparing the files raw would therefore pass whether the
 * labels were translated or not, which is the one thing the test above is for.
 */
function drawing(file: string): string {
  const svg = readFileSync(`${DIAGRAMS}/${file}`, 'utf8').split('\n').slice(1).join('\n');
  return svg.replaceAll('-de-', '-x-').replaceAll('-en-', '-x-');
}
