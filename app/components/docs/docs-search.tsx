/**
 * The documentation search box, over the Pagefind index the build writes.
 *
 * ── NOTHING IS LOADED UNTIL A READER ASKS ──
 * The index and its reader, `/pagefind/pagefind.js` and a WebAssembly file per language, are not
 * part of this app's bundle. They are fetched the first time the box takes focus, so a reader who
 * never searches downloads none of it. The import is a URL built at run time and marked
 * `@vite-ignore`, because the file exists only in `build/client` after `pnpm build` and Vite must
 * not try to resolve it.
 *
 * ── IT NEVER THROWS ──
 * Under `pnpm dev` there is no index, and a reader offline has none either. Every failure lands in
 * one state, `unavailable`, which prints a one-line hint in the panel. Search is a convenience on
 * top of pages that work without it.
 *
 * ── NOTHING MOVES ──
 * The box has a fixed height from the first paint, and the results are a panel positioned over the
 * page, never in its flow. The caller places the panel, because the rail and the phone bar anchor
 * it differently: under the box in the rail, the full width of the bar on a phone.
 *
 * Pagefind's own UI and its CSS are not used. They bring a stylesheet of their own, and the results
 * here are drawn from this site's tokens like every other list.
 */
import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';

import { useLanguage } from '#app/i18n/use-language';
import {
  type ExcerptPart,
  type PagefindModule,
  type PagefindResultData,
  excerptParts,
  sitePath,
} from '#app/lib/pagefind';
import { SearchIcon } from './doc-icons';
import { THIN_SCROLLBAR } from './layout';

/** Enough to choose from; a longer list is a reason to type another word. */
const RESULT_LIMIT = 8;

/** How long typing must pause before a search runs. Pagefind drops the calls in between. */
const DEBOUNCE_MS = 200;

interface Hit {
  url: string;
  title: string;
  component: string | null;
  excerpt: ExcerptPart[];
}

type SearchState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; hits: Hit[] } | { kind: 'unavailable' };

/*
 * Module state, shared by every search box on the page: the rail's and the phone bar's are two
 * components over one index. `modulePromise` is the script, fetched once. `prepared` is the script
 * initialised for one language. Pagefind reads `<html lang>` when it initialises, so a reader who
 * switches language by a client-side navigation gets the old language's index until it is
 * destroyed and initialised again, which is what a change of `language` below does.
 */
let modulePromise: Promise<PagefindModule> | null = null;
let prepared: { language: string; pagefind: Promise<PagefindModule> } | null = null;

function importPagefind(): Promise<PagefindModule> {
  modulePromise ??= (async () => {
    const url = new URL('/pagefind/pagefind.js', window.location.origin).href;
    const loaded: PagefindModule = await import(/* @vite-ignore */ url);
    // A dev server may answer with a page instead of a 404. Whatever came back, it is the search
    // API only if it can search.
    if (!(loaded.debouncedSearch instanceof Function)) throw new Error(`${url} is not the Pagefind API`);
    return loaded;
  })();
  return modulePromise;
}

function pagefindFor(language: string): Promise<PagefindModule> {
  if (prepared?.language === language) return prepared.pagefind;
  const pagefind = importPagefind().then(async (loaded) => {
    await loaded.destroy();
    await loaded.init();
    return loaded;
  });
  prepared = { language, pagefind };
  return pagefind;
}

function toHit(data: PagefindResultData): Hit {
  return {
    url: sitePath({ url: data.url, origin: window.location.origin }),
    title: data.meta.title ?? data.url,
    component: data.meta.component ?? null,
    excerpt: excerptParts(data.excerpt),
  };
}

export function DocsSearch({
  wrapperClassName = '',
  panelClassName,
}: {
  /** `relative` to anchor the panel to the box; leave it off to anchor it to a positioned parent. */
  wrapperClassName?: string;
  /** Where the panel sits, how wide it is, and its side borders. It is always `absolute top-full`. */
  panelClassName: string;
}) {
  const { t } = useTranslation('docs');
  const language = useLanguage();
  const { pathname } = useLocation();
  const panelId = useId();
  /** The newest term typed, so an answer to an older one is dropped instead of drawn. */
  const latestTerm = useRef('');
  const wrapperRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  // A result is a navigation. The new page starts with a closed, empty box.
  useEffect(() => {
    latestTerm.current = '';
    setQuery('');
    setIsOpen(false);
    setState({ kind: 'idle' });
  }, [pathname]);

  // A press or a focus anywhere outside the box and its panel closes the panel. Focus that moves
  // from the field to a result stays inside, so tabbing through the results keeps them open.
  useEffect(() => {
    if (!isOpen) return undefined;
    function closeIfOutside(event: Event): void {
      const wrapper = wrapperRef.current;
      if (wrapper === null) return;
      if (event.target instanceof Node && wrapper.contains(event.target)) return;
      setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeIfOutside);
    document.addEventListener('focusin', closeIfOutside);
    return () => {
      document.removeEventListener('pointerdown', closeIfOutside);
      document.removeEventListener('focusin', closeIfOutside);
    };
  }, [isOpen]);

  function prepare(): void {
    setIsOpen(true);
    pagefindFor(language).catch(() => {
      setState({ kind: 'unavailable' });
    });
  }

  async function search(term: string): Promise<void> {
    latestTerm.current = term;
    if (term.trim() === '') {
      setState((previous) => (previous.kind === 'unavailable' ? previous : { kind: 'idle' }));
      return;
    }
    setState((previous) => (previous.kind === 'ready' ? previous : { kind: 'loading' }));
    try {
      const pagefind = await pagefindFor(language);
      const found = await pagefind.debouncedSearch(term, {}, DEBOUNCE_MS);
      if (found === null || latestTerm.current !== term) return;
      const data = await Promise.all(found.results.slice(0, RESULT_LIMIT).map((result) => result.data()));
      if (latestTerm.current !== term) return;
      setState({ kind: 'ready', hits: data.map(toHit) });
    } catch {
      setState({ kind: 'unavailable' });
    }
  }

  const status = statusText({ state, t });
  const hits = state.kind === 'ready' ? state.hits : [];
  const isPanelVisible = isOpen && (query.trim() !== '' || state.kind === 'unavailable');

  return (
    // `block` because a browser older than the <search> element draws an unknown tag inline.
    <search ref={wrapperRef} className={`block ${wrapperClassName}`}>
      <label className="relative block">
        <span className="sr-only">{t('search.label')}</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        {/* `text-base` below `sm`: a phone zooms the page into any field set smaller than 16px. */}
        <input
          type="search"
          value={query}
          placeholder={t('search.placeholder')}
          autoComplete="off"
          spellCheck={false}
          aria-controls={panelId}
          onFocus={prepare}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            void search(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false);
          }}
          className="h-10 w-full appearance-none border border-border bg-background pr-3 pl-9 font-prose text-base text-foreground placeholder:text-muted-foreground sm:text-sm"
        />
      </label>
      {/* Read by a screen reader as it changes. The panel repeats it for the eye. */}
      <output className="sr-only">{status}</output>
      {isPanelVisible && (
        // `preventDefault` on mousedown keeps the focus in the field while a result is pressed. A
        // browser that does not focus a link on click would otherwise blur the field, close this
        // panel, and lose the click.
        // oxlint-disable-next-line jsx-a11y/no-static-element-interactions -- mouse focus guard only; every control inside is a link
        <div
          id={panelId}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          className={`absolute top-full z-40 max-h-[min(28rem,70dvh)] overflow-y-auto border-y border-border bg-card shadow-lg ${THIN_SCROLLBAR} ${panelClassName}`}
        >
          {status === '' ? null : <p className="px-4 pt-3 pb-2 text-xs text-muted-foreground">{status}</p>}
          {hits.length === 0 ? null : (
            <ul className="pb-2">
              {hits.map((hit) => (
                <li key={hit.url}>
                  <Link
                    to={hit.url}
                    onClick={() => {
                      setIsOpen(false);
                    }}
                    className="block px-4 py-2.5 transition-colors hover:bg-muted focus-visible:bg-muted"
                  >
                    <span className="block text-sm font-medium text-foreground">{hit.title}</span>
                    {hit.component === null ? null : (
                      <span className="block text-xs text-muted-foreground">{hit.component}</span>
                    )}
                    <span className="mt-1 line-clamp-3 block font-prose text-sm leading-snug text-muted-foreground">
                      {hit.excerpt.map((part) =>
                        part.isMatch ?
                          <mark key={part.at} className="bg-transparent font-semibold text-foreground">
                            {part.text}
                          </mark>
                        : <Fragment key={part.at}>{part.text}</Fragment>,
                      )}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </search>
  );
}

/** The one line the panel and the live region say, for each state. */
function statusText({
  state,
  t,
}: {
  state: SearchState;
  t: (key: string, options?: { count: number }) => string;
}): string {
  if (state.kind === 'idle') return '';
  if (state.kind === 'loading') return t('search.loading');
  if (state.kind === 'unavailable') return t('search.unavailable');
  if (state.hits.length === 0) return t('search.noResults');
  return t('search.results', { count: state.hits.length });
}
