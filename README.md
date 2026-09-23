# openplate-website

The project site at [openplate.de](https://openplate.de): what openplate is, the
three components it is built from (the app, the sync server, the inference
runtime), and each component's documentation, in six languages: German, English,
French, Italian, Spanish and Turkish. The app itself lives at `beta.openplate.de`
and is a separate repository.

The site is a React Router 7 project in framework mode, prerendered at build
time. `pnpm build` writes one static HTML file per URL under `build/client/`,
then runs Pagefind over those files to write the docs search index to
`build/client/pagefind/` ([ADR-0009](.adr/0009-docs-search-is-pagefind-after-the-prerender.md)).
There is no database, no session, no background worker and no account. German
is at `/`, every other language under its prefix (`/en/`, `/fr/`, `/it/`,
`/es/`, `/tr/`), and all of them are written to disk, so a page is a file
either way. `app/i18n/language.ts` is the one list; the route table, the
sitemap, the hreflang tags, the prerenderer and the diagram sync all derive
from it.

## Where the documentation comes from

Nothing under `/docs` is written in this repository. `scripts/sync-docs.ts`
reads each source repository at the ref described below, takes the documentation
table in that repository's README as the manifest of what to publish, parses the
markdown once into typed TypeScript modules under `src/generated/`, and commits
them. `scripts/translate-docs.ts` then translates the changed sentences into
German. The site renders those modules directly: no markdown library runs at
request time. A release in a source repository triggers the whole chain, so a
documentation change reaches the site without a hand in the loop.

**Which ref, and why it is usually the tag.** A source is read at its highest
`vX.Y.Z` tag, because the default branch can document code that is not released
yet. That page would be internally consistent, read perfectly, and describe a
program the reader cannot run, which is the kind of wrong nobody reports.

**And the documentation on top of it, decided per file.** Documentation is not a
release, so a correction to a guide must reach a reader without a version bump.
The tree the site publishes is therefore a HYBRID: the tag, with individual
documentation files laid over it from the default branch. A documentation file
is taken from the branch when it differs from the tag AND every commit since the
tag that touched it touched documentation and nothing else. Everything else in
the tree, every source file, every compose file, every `.env.example`, is the
tag's, always.

The criterion is provenance. A file whose last change rode in beside a code
change belongs to that code's release and waits for its tag; a file only ever
touched by documentation-only commits is a documentation fix, and the code
around it is irrelevant to it. It is decided per FILE and never once per
repository, which is the whole point: the rule this replaced asked one question
of the whole range, so one code change anywhere sent every page back to the tag,
and a published documentation fix could be reverted by somebody who had never
touched it. [ADR-0008](.adr/0008-documentation-is-quoted-per-file.md) records
both incidents and the decision, including the cost it accepts.

The sync says what it took, per source, with the tag, the branch and the short
shas:

```
sync-docs: app — main is exactly v0.12.0, quoting the tag at 20c6010
sync-docs: app — v0.12.0 plus 3 documentation file(s) from main at a205674, 1 more waiting for the next release. Quoting v0.12.0 at 20c6010
sync-docs: app — code has moved past v0.12.0 on main and no documentation file there is a documentation-only change, so a fix in one waits for the next release. Quoting v0.12.0 at 20c6010
```

`SOURCE.json` records `ref` and `commit` for the tag, and `branch`,
`branchCommit` and `documentationFrom` for the overlay, which together rebuild
the same tree byte for byte. The documentation index shows the tag, because the
code those pages describe is the tag's.

One thing the hybrid can break, and it fails loudly rather than quietly. The
README is the manifest, and it is a documentation file with its own verdict, so
a new `docs/` page can arrive from the branch beside a README from the tag that
has never heard of it. The sync refuses, names the file and both refs, and tells
you to land a documentation-only commit that changes both or wait for the tag.
It never falls back to quoting the whole repository at the tag.

## Where the site's own copy comes from

The section above is about the documentation, which is quoted. This is about the
site's own strings, the ones in `app/i18n/locales/`: navigation labels, headings,
the sentences on the front page. They are produced the same way the documentation
is, by hash, sentence by sentence.

**English is hand-written and is the source of truth.** `app/i18n/locales/en/`
is edited by a person and by nothing else, and every string in it goes through
the workspace `wordsmith` tool before it lands.

**The other bundles are machine-translated and committed.**
`scripts/translate-ui.ts` flattens each English namespace to its leaves, hashes
each value, asks the model only for the hashes its memory does not already
answer, and writes the target bundle back from the English tree, so a diff shows
changed values and never a reordering. The memory is
`src/generated/ui-i18n/<locale>.json`, keyed by a hash of the catalog path and
the English together, beside the documentation's memory and never inside it.
Each entry carries its `path` (`common:site.nav.docs`) beside the `en`, which
is how a person finds it. Edit one English sentence and its hash stops
matching, so that one string is re-bought and the rest stay put. One English
sentence under two paths is two entries, bought twice, on purpose: the app's
catalog showed that one word ("Fasting") can be two translations, and a memory
keyed by the English alone gave both paths one of them.

```bash
toolbox run -c ts-dev env CI=true pnpm translate:ui --locale fr --dry
toolbox run -c ts-dev env CI=true pnpm translate:ui --locale fr --budget 0.05 --local
```

The exit codes are `translate:docs`'s: `0` done, `1` broken, `2` refused on cost.
Two is not a failure, the English is still correct and still ships.

**Three kinds of string are never sent to the model**: one that is nothing but
`{{placeholders}}`, one with no letter in it such as `2026` or `16:8`, and one
whose every word is a product name the style prompt already pins to English, such
as `openplate-core`. Those keep whatever the target bundle holds, which is the
English, and that is what a reader should see for them. The rule is
`skipReason` in `scripts/lib/translate-ui.ts` and its header argues for it.

**A translation that loses an interpolation is refused rather than stored.** A
renamed `{{price}}` renders as literal braces on the page forever, because
i18next substitutes by name, and half a `<selfHosting>` tag pair takes a link's
words with it. An answer that does either is asked for once more on its own, and
then left in English, which i18next answers from the source bundle.

`tests/unit/ui-parity.test.ts` is the guard: every locale has exactly the English
key set, exactly the same placeholders and tags, and no string over 40 characters
left byte-identical to its English.

**German was hand-written first**, and `--adopt` is how that was kept. It records
the bundle as it stands, stamped `hand-written`, so the pipeline inherits the
reviewed copy instead of buying a machine replacement for it. It is a flag and
never the default: adopting on every run would pair a NEW English hash with an
OLD translation and the edited string would never be re-bought.

## Running it

Every command runs inside the `ts-dev` toolbox container, because the host has
no native build tools.

```bash
toolbox run -c ts-dev env CI=true pnpm install
toolbox run -c ts-dev env CI=true pnpm dev      # http://localhost:3000
toolbox run -c ts-dev env CI=true pnpm build    # build/client/**/*.html
toolbox run -c ts-dev env CI=true pnpm start    # serve the build
```

To move the documentation forward, run the sync. It reads each source
repository at its highest release tag, or at a checkout you already have:

```bash
toolbox run -c ts-dev env CI=true pnpm sync:docs
OPENPLATE_APP_REPO=../openplate pnpm sync:docs      # read a checkout in place
OPENPLATE_SYNC_REF=v0.6.0 pnpm sync:docs            # pin one source to a ref
```

`OPENPLATE_APP_*`, `OPENPLATE_SYNC_*` and `OPENPLATE_INFERENCE_*` are the three
pairs. A repository given as a path on disk is read where it stands, at whatever
it says today, which is what makes a documentation table written five minutes
ago testable. Everything it writes under `src/generated/` is committed.

That override reads the checkout IN PLACE and skips ref resolution entirely, so
it cannot exercise the per-file rule above. A path with no `.git` directory in
it is cloned like any other, so a BARE repository (`/tmp/thing.git`) is how that
code path is driven locally with no network writes, and it is how
`tests/unit/released-mixed-diff.test.ts` drives the hybrid tree.

`sync-docs.ts` runs its whole sync at import: the refusals ARE the exit code and
the printed line, so its tests spawn it as a child process against fixture
repositories in `/tmp`. Any pure function that deserves a direct unit test has
to be moved into `scripts/lib/` first, which is where `documentationOnly` and
`documentationAhead` live.

The sync also draws the diagrams. A ```mermaid fence in a source document is
rendered here into `public/docs/diagrams/<id>-<language>-light.svg` and
`<id>-<language>-dark.svg`, which are committed too, and the page shows one of
them with a `<picture>`: the URL picks the language, the media query picks the
appearance. Nothing the reader downloads knows what mermaid is. That needs a
browser, because mermaid has no renderer that is not one, and it uses the
chromium playwright has already put in `~/.cache/ms-playwright/` rather than
downloading its own. **The toolbox cannot run that browser**: the container has
no `libnspr4`, so the sync reaches the host with `flatpak-spawn --host` when it
must, and says so plainly when it cannot. Point `OPENPLATE_CHROME` at a browser
of your own to skip the search.

A fence must open with `%% alt: <one short sentence>`, which is the description
a reader who gets no drawing is given. That description and the fence's LABELS
are translated: the quoted text is lifted out, bought through the same memory
every other sentence on the site comes from, put back between the same quotes,
and the drawing is made again per language. The fence itself is never sent to a
translator, so nothing can localise a node id or an arrow.

That is why a flowchart label must be in double quotes: the quotes are where a
label starts and ends, and a rule that worked it out instead would one day drop
a word. An unquoted label, a label longer than six words, a fence with no
description, and a diagram inside a list item each fail the sync with the file
named. A family that cannot quote, a sequence diagram writes its messages after
a colon, is left alone and drawn in English everywhere. So is any diagram whose
labels are not all bought yet: half a drawing in German reads as a bug, a whole
one in English reads as a diagram nobody has got to.

The order is sync, `translate:docs`, sync again. The first sync draws a new
diagram in English twice, the translation buys its labels, and the second sync
notices that the German copy no longer matches the words and redraws that one
file.

Two smaller syncs pull pictures out of another repository the same way, at a
pinned ref, with output that is committed:

```bash
toolbox run -c ts-dev env CI=true pnpm sync:icons   # public/favicon.ico, public/icons/
toolbox run -c ts-dev env CI=true pnpm sync:shots   # public/shots/<locale>/
```

`sync:icons` copies the mark from `openplate-brand`, which is where it is drawn.
The application installs it from there too, on the same terms, so neither of the
two is the other's source. The brand repository publishes a sha256 for every
asset and the sync checks it, so a copy that does not match what was published
fails the run and writes nothing.

`sync:shots` copies the product screenshots that
`openplate/scripts/capture-landing.ts` makes, one set per interface language,
because a German page around an English screenshot is the same defect as a
German page around English prose. `app/lib/shots.ts` is the manifest and it is
the same module the components read: a capture named there and missing upstream
fails the run with every missing file listed, and anything under `public/shots/`
that it does not name is pruned. The sync screen is captured upstream and is
deliberately not copied; that file's header says why.

`pnpm install` runs `prepare`, which points git at the in-repo hooks. After a
clone that has not installed yet, enable the gate by hand:

```bash
git config core.hooksPath .githooks
```

## The gate

`.githooks/pre-push` runs lint, typecheck, unit tests, the staleness check and
the production build, in that order. There is no cloud test runner: a push from the workstation is
what triggers the deploy, so the gate sits in front of it. The build tier is the
one that matters most here, because prerendering happens there and nowhere else.

The staleness tier re-runs `sync:docs` at the releases `src/generated/SOURCE.json`
records and fails on any diff under `src/generated/`, so a generated file edited
by hand, or a sync run and only half committed, cannot be pushed. The ref and
not the `commit` beside it. Pinning the commit was tried, on the argument that a
`ref` can now be a branch and a branch moves, and this tier caught it: the sync
records whatever ref it is given, so a run pinned to a bare sha writes that sha
into `ref`, into `docs-index.ts` and into all three `releases/*.ts`, and the
check then fails on a clean tree. It pins that `ref` through `OPENPLATE_*_TAG`,
which fixes the BASE and lets the per-file documentation rule run again.
`OPENPLATE_*_REF` would rebuild the tag alone and drop the overlay, and the tier
would then fail on every clean tree. Re-resolving the overlay is also what keeps
it honest: if somebody pushed documentation upstream since, this tree is
genuinely stale and the check says so. It clones the three repositories, so it
needs the network. `SKIP_SYNC=1 git push` skips that tier alone;
`SKIP_TESTS=1 git push` skips the whole gate.

Copy `.env.example` to `.env` if you need it. The running site needs no secret;
the only key in there is read by the translation script.

## The release chain

The three source repositories tell this one when they publish, and this one
re-quotes them. Nobody runs anything.

**The dispatch.** Each source repository's `.github/workflows/release-image.yml`
has a `dispatch-website` job. It runs on a `v*` tag that is not a prerelease,
beside the image build rather than after it, and posts a `repository_dispatch`
to `LowCarbCheck/openplate-website`:

```
event_type:     openplate-released
client_payload: { "repo": "openplate-core", "tag": "v0.6.0" }
```

The payload says which release woke the run and nothing more. Which release the
site documents is decided in one place, `released` in `scripts/sync-docs.ts`: the
highest `vX.Y.Z` tag each repository has, plus the documentation files that are a
documentation-only change since it. "Where the documentation comes from" above
says why that is safe. Every run syncs all three sources, so a dispatch that is
lost is healed by the next release or by the schedule.

A documentation-only push to a source repository dispatches NOTHING, because a
member's release job only runs on a `v*` tag. The daily pass at 06:41 UTC is the
delivery path for such a fix, so it reaches the site up to roughly 24 hours
later, plus the build and the rollout. Sooner, by hand:
`gh workflow run sync-docs.yml -f budget=0`.

The workflow passes its `app_ref`, `sync_ref` and `inference_ref` inputs through,
and they are empty on a dispatch and on a schedule, so CI resolves the ref afresh
on every run. That is deliberate: a documentation fix pushed to a source branch
is on the site within a day without anybody cutting a release.

**The workflow.** `.github/workflows/sync-docs.yml` runs on that dispatch, daily
at 06:41 UTC, and by hand. It syncs, translates what changed, runs the same four
tiers the push gate runs, builds, commits as `openplate-docs-bot`, pushes, and
then waits for the live site to serve the new commits in `SOURCE.json`. While
`vars.OPENPLATE_WEBSITE_ORIGIN` is unset there is no deployed site to poll and
that last step says so and passes; M194 sets the variable.

Run it by hand from a terminal, which is how you approve a translation the
budget refused, or pin one source to an unreleased ref:

```bash
gh workflow run sync-docs.yml -f budget=0.50
gh workflow run sync-docs.yml -f budget=0 -f app_ref=main
gh run list --workflow sync-docs.yml --limit 5
```

`budget` is the spend ceiling in US dollars for the whole run; `0` buys nothing
and re-quotes the English. `app_ref`, `sync_ref` and `inference_ref` each
override one source's ref.

**The second workflow.** `.github/workflows/translate-ui.yml` does the same job
for the site's own catalogs, and it is separate because the two corpora move on
unrelated schedules. It runs on a push to `main` that touches
`app/i18n/locales/en/**`, and by hand. There is no schedule: nothing moves the
English bundle except a commit to this repository, and that commit is the
trigger. It commits as the same bot, with the same rebase recovery, and its
`budget` is the ceiling for ONE language, defaulting to `0.05`.

```bash
gh workflow run translate-ui.yml -f budget=0.10
gh run list --workflow translate-ui.yml --limit 5
```

**The secrets.** Two in this repository, one in each source repository. All
three are already set; they are listed here because a fine-grained PAT expires
inside a year and the failure is silent until someone reads this.

| Secret | Where | What it is for |
| --- | --- | --- |
| `OPENPLATE_WEBSITE_PUSH_TOKEN` | this repository | Checkout and push. A PAT and not `GITHUB_TOKEN`: a push made with `GITHUB_TOKEN` triggers no workflow, so no gate would run on the bot's commit. |
| `OPENROUTER_API_KEY` | this repository | The translation model. |
| `OPENPLATE_WEBSITE_DISPATCH_TOKEN` | each source repository | Posting the dispatch to this repository. Contents write, on this repository only. |

```bash
gh secret set OPENPLATE_WEBSITE_PUSH_TOKEN --repo LowCarbCheck/openplate-website
gh secret set OPENROUTER_API_KEY --repo LowCarbCheck/openplate-website
gh secret set OPENPLATE_WEBSITE_DISPATCH_TOKEN --repo LowCarbCheck/openplate
```

## License

MIT. See [LICENSE](LICENSE).
