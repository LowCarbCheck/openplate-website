# Repository Guidelines

The project site for openplate. A React Router 7 app in framework mode,
**prerendered to static HTML**. There is no database, no session, no background
worker and no account. Read [README.md](README.md) first; it says what the site
is and where its documentation pages come from.

## Project Structure

- `app/` — routes, the route table, the i18n layer, the stylesheet
- `app/i18n/` — the language model. The URL prefix IS the language (`/` English,
  `/de/...` German). There is no cookie and no detector; a prerendered document
  has no request to read one from.
- `app/prerender.ts` — the dynamic paths `getStaticPaths()` cannot work out
- `public/` — files copied verbatim into the build
- `tools/oxlint/anti-slop/` — vendored third-party lint plugin, MIT (do not edit;
  provenance in [tools/oxlint/README.md](tools/oxlint/README.md))
- `.githooks/` — pre-commit lint gate and pre-push test gate

## Commands

Every command runs inside the `ts-dev` toolbox container:
`toolbox run -c ts-dev env CI=true pnpm <script>`.

```bash
pnpm dev          # dev server on :3000
pnpm build        # production build; this is where prerendering happens
pnpm start        # serve the build
pnpm lint         # oxlint, the whole tree
pnpm typecheck    # react-router typegen && tsc
pnpm test:unit    # node:test
```

**Never run bare `tsc`** — it emits `.js` files next to the sources. `pnpm
typecheck` runs it with `--noEmit` via `tsconfig.json`.

## Prerendering is the constraint

`react-router.config.ts` prerenders every route, so **the build is the only
place a page is ever rendered.** Two consequences that decide most design
questions here:

1. **A loader runs at build time, not at request time.** It may read the
   repository. It may not read a request header, a cookie or a session, because
   there is none.
2. **A route with a parameter emits nothing unless its paths are named.** Add
   them in `app/prerender.ts`, or the page 404s in production while the build
   stays green.

## Adding a page

One row in `PAGES` in `app/routes.ts` registers the page in **every** language,
and one key per language in `app/locales/<lang>/common.json` gives it its copy.
Do not register a language variant by hand: a page that exists in English and
not in German is a 404 that no test will catch.

## Copy and translations

English source strings are hand-written and are the source of truth. Every
user-facing string, English or German, is judged by `google/gemini-3.8-flash`
through the workspace `wordsmith` tool before it lands. Plain, direct, a little
dry. **No em dashes and no en dashes**, in copy or in comments; use a comma.

The documentation pages are not covered by this: they are generated from the
source repositories and translated by their own script.

## Linting

**oxlint is this repo's linter**, and the only one. It runs oxlint's own
correctness/suspicious/perf catalog *and*
[dmmulroy/anti-slop](https://github.com/dmmulroy/anti-slop) in a single pass over
`.oxlintrc.json` — oxlint's default config path, so a bare `oxlint` (editor
extension, `--fix`, ad-hoc run) picks up the full gate with no flags. See
[ADR-0005](.adr/0005-oxlint-and-anti-slop-are-the-lint-gate.md) and
[ADR-0007](.adr/0007-one-linter-and-typescript-7.md).

**All 15 anti-slop rules run at `error`.** The plugin is a vendored copy (MIT)
under `tools/oxlint/anti-slop/`, loaded via `jsPlugins`; it is not an npm
dependency and upstream publishes none. Do not edit the vendored tree, and do
not downgrade a rule to clear a finding. Fix the code.

**Editing the `overrides` globs:** oxlint matches `files` against the full path,
so every glob needs a `**/` prefix. A bare `app/**/*.ts` silently matches
nothing — no error, it just never applies.

### Where the gate runs

| Surface | What runs | Wiring |
|---------|-----------|--------|
| Editor | oxlint on type, `source.fixAll.oxc` on save | `.vscode/settings.json` + the `oxc.oxc-vscode` recommendation |
| Claude Code | oxlint on each written/edited file; a finding blocks with the diagnostic | `.claude/hooks/lint-edited-file.sh` (PostToolUse) |
| Commit | oxlint on staged files | `.githooks/pre-commit`, installed by the `prepare` script |
| Push | full-tree oxlint → typecheck → unit tests → build | `.githooks/pre-push`, the repo's only test gate |

`git commit --no-verify` skips the commit hook; pre-push lints the whole tree
anyway. `SKIP_TESTS=1 git push` skips the push gate and pushes unverified code —
use it deliberately, and say so.

### Rules deliberately disabled

| Rule | Why off |
|------|---------|
| `react/react-in-jsx-scope` | Automatic JSX runtime (React 19 + Vite). The rule predates it. |
| `unicorn/no-instanceof-builtins` | It wants `typeof x === 'function'`, which `anti-slop/no-runtime-typeof` bans. |
| `import/no-named-as-default-member` | The default-namespace form is the correct CJS-interop idiom for the packages that trip it. |
| `import/no-unassigned-import` | A side-effect import is the documented usage for some packages. |
| `eslint/no-await-in-loop` | Sequential work is sometimes correct by design; the rule pushes toward incorrect parallelization. |
| `eslint/no-underscore-dangle` | Deliberate `globalThis` singletons that survive HMR. |
| `jsx-a11y/control-has-associated-label` | Fires on `<tr>`, which is not a control. `label-has-associated-control` stays on. |

## Key Documentation

| Topic | Location |
|-------|----------|
| TypeScript | [.claude/typescript-rules.md](.claude/typescript-rules.md) |
| React | [.claude/react-rules.md](.claude/react-rules.md) |
| React Router | [.claude/react-router-rules.md](.claude/react-router-rules.md), [skill](.claude/skills/react-router-framework-mode/SKILL.md) |
| ES modules | [.claude/es-modules.md](.claude/es-modules.md) |
| Architecture Decisions | [.adr/README.md](.adr/README.md) |

## Architecture Decision Records

Significant decisions — anything that constrains future work, locks in a
trade-off, or would surprise a new contributor — are recorded in [`.adr/`](.adr/).
Read them before proposing a change in the same area; if you make a new big-call
decision, write the ADR in the same conversation. Copy
`.adr/0000-template.md` to the next zero-padded number and add it to both
indexes.

### Index

| # | Title | Status |
|---|-------|--------|
| [0005](.adr/0005-oxlint-and-anti-slop-are-the-lint-gate.md) | oxlint + anti-slop is the lint gate | Accepted |
| [0007](.adr/0007-one-linter-and-typescript-7.md) | One linter (oxlint), and TypeScript 7 | Accepted |

This repository was cloned from `ts-factory-stack` and stripped of everything
that needed a database, a session or a worker process: the ORM, the tenancy
wrapper, the job queue, auth, CSRF, the CLI and the file-backed CMS. The starter's
ADRs 0001 to 0004 described exactly those parts and were removed with them.

## Coding Style Summary

- **TypeScript**: strict, no `any`
- **Files**: `kebab-case.ts/tsx`
- **React**: avoid `useEffect` for derived state; prefer early returns over
  nested ternaries
- **Prose and comments**: no em dashes, no en dashes

## Commits

Conventional commits, lowercase, with a body that explains why.
