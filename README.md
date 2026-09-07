# openplate-website

The project site at [openplate.de](https://openplate.de): what openplate is, the
three components it is built from (the app, the sync server, the inference
runtime), and each component's documentation, in English and German. The app
itself lives at `beta.openplate.de` and is a separate repository.

The site is a React Router 7 project in framework mode, prerendered at build
time. `pnpm build` writes one static HTML file per URL under `build/client/`.
There is no database, no session, no background worker and no account. English
is at `/`, German at `/de/`, and both are written to disk, so a page is a file
either way.

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

There is one exception, and it rests on an invariant rather than on trust. The
sync compares the tree at the tag with the tree at the default branch. If every
path that differs is `README.md`, `CHANGELOG.md` or under `docs/`, then the code
on the branch IS the released code, byte for byte. There is no unreleased
behaviour for the branch's documentation to be describing, so the branch is
quoted instead of the tag and a correction to a guide reaches the site without a
version bump for a change that ships no code. One differing path outside those
three and the argument is gone, so the tag is quoted again and the fix waits for
the next release. The comparison is the NET difference between the two trees and
not a walk of the commits: a branch that changed a source file and then reverted
it has moved no code.

The sync says which of the three cases it took, per source, with the tag, the
branch and the short sha:

```
sync-docs: app — main is exactly v0.12.0, quoting the tag at 20c6010
sync-docs: app — v0.12.0 plus documentation only, quoting main at a205674
sync-docs: app — code has moved past v0.12.0 on main, so a documentation fix there waits for the next release. Quoting v0.12.0 at 20c6010
```

In the middle case `SOURCE.json` records the branch as `ref` and the branch's
commit as `commit`, and the documentation index shows `main` where it usually
shows a tag. That is honest: those pages are ahead of the release.

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
it cannot exercise the tag-or-branch rule above. A path with no `.git` directory
in it is cloned like any other, so a BARE repository (`/tmp/thing.git`) is how
that code path is driven locally with no network writes.

`sync-docs.ts` runs its whole sync at import: the refusals ARE the exit code and
the printed line, so its tests spawn it as a child process against fixture
repositories in `/tmp`. Any pure function that deserves a direct unit test has
to be moved into `scripts/lib/` first, which is where `documentationOnly` lives.

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

The staleness tier re-runs `sync:docs` at the refs `src/generated/SOURCE.json`
records and fails on any diff under `src/generated/`, so a generated file edited
by hand, or a sync run and only half committed, cannot be pushed. The ref and
not the `commit` beside it. Pinning the commit was tried, on the argument that a
`ref` can now be a branch and a branch moves, and this tier caught it: the sync
records whatever ref it is given, so a run pinned to a bare sha writes that sha
into `ref`, into `docs-index.ts` and into all three `releases/*.ts`, and the
check then fails on a clean tree. The branch case is not the flake it looks
like either. A source quoted at `main` and re-resolved here asks whether this
tree still matches the branch it came from, and if somebody pushed
documentation upstream since, the answer is genuinely no. It clones the three
repositories, so it needs the network. `SKIP_SYNC=1 git push` skips that
tier alone; `SKIP_TESTS=1 git push` skips the whole gate.

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
client_payload: { "repo": "openplate-sync", "tag": "v0.6.0" }
```

The payload says which release woke the run and nothing more. Which release the
site documents is decided in one place, `released` in `scripts/sync-docs.ts`: the
highest `vX.Y.Z` tag each repository has, or that repository's default branch
when the branch is that tag plus documentation and nothing else. "Where the
documentation comes from" above says why the second case is safe. Every run syncs
all three sources, so a dispatch that is lost is healed by the next release or by
the schedule.

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
