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
reads each source repository at its released tag, takes the documentation table
in that repository's README as the manifest of what to publish, parses the
markdown once into typed TypeScript modules under `src/generated/`, and commits
them. `scripts/translate-docs.ts` then translates the changed sentences into
German. The site renders those modules directly: no markdown library runs at
request time. A release in a source repository triggers the whole chain, so a
documentation change reaches the site without a hand in the loop.

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
by hand, or a sync run and only half committed, cannot be pushed. It clones the
three repositories, so it needs the network. `SKIP_SYNC=1 git push` skips that
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
site documents is decided in one place, `highestTag` in `scripts/sync-docs.ts`,
which takes the highest `vX.Y.Z` tag each repository has. Every run syncs all
three sources, so a dispatch that is lost is healed by the next release or by
the schedule.

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
