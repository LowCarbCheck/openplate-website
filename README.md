# openplate-website

The project site at [openplate.de](https://openplate.de): what openplate is, the
three components it is built from (the app, the sync server, the inference
runtime), and each component's documentation, in English and German. The app
itself lives at `app.openplate.de` and is a separate repository.

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

`.githooks/pre-push` runs lint, typecheck, unit tests and the production build,
in that order. There is no cloud test runner: a push from the workstation is
what triggers the deploy, so the gate sits in front of it. The build tier is the
one that matters most here, because prerendering happens there and nowhere else.

Copy `.env.example` to `.env` if you need it. The running site needs no secret;
the only key in there is read by the translation script.

## License

MIT. See [LICENSE](LICENSE).
