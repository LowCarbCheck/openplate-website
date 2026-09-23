# 0009, Docs search is Pagefind, run over the prerendered pages

- **Status:** Accepted
- **Date:** 2026-09-23
- **Deciders:** the operator; implemented by the typescript worker

## Context

The documentation is sixteen guides in six languages, and the only way to find a sentence in them
was the browser's find on one page. The site is static files behind nginx: there is no server to
run a query and no request time at which to run one.

## Decision

`pnpm build` runs `pagefind --site build/client` after `react-router build`. Pagefind reads the
prerendered HTML and writes a static index under `build/client/pagefind/`, split by `<html lang>`,
so each language searches its own pages.

- Only the doc articles are indexed: `data-pagefind-body` sits on the `<article>` in
  `app/components/docs/doc-page.tsx`, and a page without it is skipped.
- The browser loads `/pagefind/pagefind.js` on the first focus of the search box and never before.
  `app/components/docs/docs-search.tsx` draws the box and the results from the site's own tokens;
  Pagefind's UI and CSS are not used.
- `pagefind` is a pinned devDependency. Its indexer is a static musl binary shipped as a
  per-platform optional package, so `pnpm-workspace.yaml` lists both `x64` and `arm64` under
  `supportedArchitectures`.

## Alternatives Considered

- A hand-built index at sync time, searched in JavaScript. A tokenizer, stemming for six languages
  and ranking, all to maintain here.
- A hosted search service. A third party that sees every query, and a key to keep.
- No search. The sidebar lists every guide, but not what is inside one.

## Consequences

- The Docker build and every workflow that runs `pnpm build` produce the index with no extra step.
- Under `pnpm dev` there is no index. The search box says so in one line and never throws.
- The index is part of the deploy: 2.6 MB on disk for 16 guides in six languages, measured
  2026-09-23. A reader who searches in one language fetches the 45 KB script, one 70 KB
  WebAssembly file, and only the index chunks and page fragments their query touches. About
  370 KB of it is Pagefind's own UI, which it always writes and this site never loads.
- A dependency with a native binary. A new CPU for the build host means a new entry in
  `supportedArchitectures`.

## References

- `package.json` `build` script, `pnpm-workspace.yaml`, `app/lib/pagefind.ts`.
- https://pagefind.app
