/**
 * The stack pages' sections, cut out of the synced documentation and translated.
 *
 * ── `.server`, FOR THE REASON `docs-registry.ts` EXISTS AT ALL ──
 * This module imports every one of the fifteen documentation pages and the whole
 * German translation memory, and neither belongs in a browser. The four stack
 * routes call it from a LOADER, React Router strips a loader from the client
 * build, and the suffix is what turns an accidental import from a component into
 * a build failure rather than a front page that ships 700 KB of block trees to
 * read six sections out of them. The site is prerendered, so this runs once at
 * build time and the reader is sent finished HTML.
 */
import { languageFromRequest } from '#app/i18n/language';
import { rebuildBlock, translationsFor } from '#app/lib/docs-i18n.server';
import { findDoc } from '#app/lib/docs';
import {
  STACK_SECTIONS,
  type DocumentSource,
  type PageSection,
  type StackPage,
  sectionBlocks,
} from '#app/lib/stack-sections';
import { DOCS_INDEX } from '../../src/generated/docs-index';
import { DOCS } from '../../src/generated/docs-registry';

/**
 * The synced tree, as the manifest asks about it.
 *
 * The README leads come from `docs-index.ts` and the pages from `docs-registry.ts`, which is the
 * split the two files exist for: the index is small and the fifteen pages are not.
 */
const SYNCED: DocumentSource = {
  page: (component, slug) => findDoc(DOCS, component, slug),
  readme: (component) => DOCS_INDEX[component].lead,
};

/**
 * Every section of one page, in the reader's language.
 *
 * IT THROWS, and it is the one place on these pages that can. `sync:docs`
 * refuses to write a tree in which an address does not resolve, so reaching this
 * line means the generated tree and the manifest disagree, which is a broken
 * build and not a page to render half of. The prerender turns it into a failed
 * build with the section named, which is where somebody can still fix it.
 */
export function pageSections(page: StackPage, url: string): PageSection[] {
  const memory = translationsFor(languageFromRequest(url));

  return STACK_SECTIONS[page].map((section) => {
    const blocks = sectionBlocks(section, SYNCED);
    if (blocks === null) {
      throw new Error(`stack-sections: the ${section.id} section of ${page} is not in the synced tree.`);
    }
    return {
      id: section.id,
      headingKey: section.headingKey,
      blocks: memory.size === 0 ? blocks : blocks.map((block) => rebuildBlock(block, memory)),
    };
  });
}
