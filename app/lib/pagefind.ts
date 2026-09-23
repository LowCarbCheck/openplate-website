/**
 * The part of Pagefind's browser API the docs search uses, and the pure half of reading its answer.
 *
 * `pnpm build` runs `pagefind --site build/client` after the prerender, which writes the index and
 * `/pagefind/pagefind.js` next to the pages. That script is not a module of this app: it exists only
 * in a build, it is fetched by URL on the reader's first focus of the search box, and nothing here
 * bundles it. These types describe the calls made on it and nothing more.
 *
 * Pagefind picks the index by `<html lang>` when it initialises, so the German page searches the
 * German pages. `root.tsx` writes that attribute per language.
 */

/** One hit, as `result.data()` resolves it. Only the fields the result list prints. */
export interface PagefindResultData {
  url: string;
  /** HTML: the matched words wrapped in `<mark>`, everything else escaped. */
  excerpt: string;
  meta: { title?: string; component?: string };
}

export interface PagefindResult {
  id: string;
  data: () => Promise<PagefindResultData>;
}

export interface PagefindSearchOptions {
  filters?: Record<string, string>;
}

export interface PagefindModule {
  init: () => Promise<void>;
  destroy: () => Promise<void>;
  /** Resolves null when a newer call has replaced this one inside the debounce window. */
  debouncedSearch: (
    term: string,
    options: PagefindSearchOptions,
    debounceMs: number,
  ) => Promise<{ results: PagefindResult[] } | null>;
}

/** A run of excerpt text, and whether it is one of the words that matched. */
export interface ExcerptPart {
  text: string;
  isMatch: boolean;
  /** Where the run starts in the decoded excerpt: a key that belongs to the data, not the loop. */
  at: number;
}

const ENTITIES = new Map([
  ['&amp;', '&'],
  ['&lt;', '<'],
  ['&gt;', '>'],
  ['&quot;', '"'],
  ['&#39;', "'"],
  ['&#x27;', "'"],
]);

function decodeEntities(text: string): string {
  return text.replaceAll(/&(?:amp|lt|gt|quot|#39|#x27);/g, (entity) => ENTITIES.get(entity) ?? entity);
}

/**
 * An excerpt as text runs, so the result list renders it as React text and never as HTML.
 *
 * Pagefind escapes the page text and adds only `<mark>`. Splitting on that one tag and decoding the
 * escapes gives back exactly the words it shows, with no `dangerouslySetInnerHTML` anywhere. Any
 * other tag would be dropped, which cannot happen with what Pagefind emits.
 */
export function excerptParts(html: string): ExcerptPart[] {
  const parts: ExcerptPart[] = [];
  const pieces = html.split(/<mark>|<\/mark>/);
  let at = 0;
  for (const [position, piece] of pieces.entries()) {
    const text = decodeEntities(piece.replaceAll(/<[^>]*>/g, ''));
    if (text === '') continue;
    // Odd pieces sit between an opening and a closing tag.
    parts.push({ text, isMatch: position % 2 === 1, at });
    at += text.length;
  }
  return parts;
}

/**
 * A result's URL as a path on this site, which is what the router's `<Link>` takes.
 *
 * In a browser Pagefind strips the page's own origin and already answers with a path. Anything
 * else, an absolute URL on this origin, is reduced to its path here so the result is always a
 * client-side navigation. A URL on another origin is left whole, which cannot happen with this
 * site's index.
 */
export function sitePath({ url, origin }: { url: string; origin: string }): string {
  const target = new URL(url, origin);
  if (target.origin !== origin) return url;
  return `${target.pathname}${target.search}${target.hash}`;
}
