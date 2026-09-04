/**
 * sync-docs — copy three repositories' documentation into `src/generated/`.
 *
 * A DEVELOPER TOOL, run by hand and by the release workflow, whose output is
 * COMMITTED.
 *
 * Why not at build time, which is the obvious place for it: the site's image
 * has no network, and giving it one means a GitHub outage, a rate limit or a
 * rename can fail a deploy for a reason that has nothing to do with the site.
 * Committing the extraction keeps the build hermetic and puts the docs in code
 * review, where a change to what this site CLAIMS openplate does is something a
 * human sees before it ships.
 *
 *   pnpm sync:docs                                   # every source at its highest tag
 *   OPENPLATE_APP_REPO=../openplate pnpm sync:docs   # a checkout you already have
 *   OPENPLATE_SYNC_REF=v0.6.0 pnpm sync:docs         # any ref
 *
 * ── THE README IS THE MANIFEST, SO THIS SCRIPT NAMES NO PAGE ──
 * Which files, in what order, and what each one is for, all come out of each
 * repository's own `## Documentation` table. A list of pages written down HERE
 * would be a second copy of a table of contents the repository already keeps,
 * kept in step by hand.
 *
 * What it refuses to do is emit a page with a hole in it. A table row pointing
 * at a file that is not there, a `docs/*.md` the table never mentions, a file
 * with no `# ` title, and an image outside `docs/images/` each exit non-zero
 * with the file named. A site quoting docs it no longer has is worse than a
 * build that fails.
 *
 * PORTED FROM collie-website's `scripts/sync-docs.ts`, bun to node. What the
 * three-source shape forced is written on `SOURCES`, `worktree` and
 * `tableRows` below; nothing else was rewritten for the sake of it.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { docRoute } from '../app/lib/doc-routes';
import type { ComponentDocs, ComponentReleases, DocComponent, DocEntry, DocFile, DocSource } from '../app/lib/docs';
import { parseChangelog } from './lib/changelog';
import { cloneAt } from './lib/clone';
import { IMAGES_DIR, type LinkBase, extractSection, parseBlocks, parseInline } from './lib/markdown';
import { syncImages } from './lib/sync-images';

/**
 * The three repositories this site publishes, and how to reach each one.
 *
 * ── THE DIMENSION COLLIE'S SCRIPT DOES NOT HAVE ──
 * collie syncs one repository, so its repo, its ref and its web address are
 * three module constants. Everything below is written once and run three times
 * instead. The env names are per source and not global for the same reason a
 * component is part of the URL: `OPENPLATE_REF` would be ambiguous the moment
 * two of them need different refs, which is the normal case between releases.
 */
interface Source {
  component: DocComponent;
  /** Where to clone from when the env override is unset. */
  repo: string;
  /** The repository's web address, for links this site does not publish itself. */
  web: string;
  envRepo: string;
  envRef: string;
}

const SOURCES: Source[] = [
  {
    component: 'app',
    repo: 'https://github.com/LowCarbCheck/openplate.git',
    web: 'https://github.com/LowCarbCheck/openplate',
    envRepo: 'OPENPLATE_APP_REPO',
    envRef: 'OPENPLATE_APP_REF',
  },
  {
    component: 'sync',
    repo: 'https://github.com/LowCarbCheck/openplate-sync.git',
    web: 'https://github.com/LowCarbCheck/openplate-sync',
    envRepo: 'OPENPLATE_SYNC_REPO',
    envRef: 'OPENPLATE_SYNC_REF',
  },
  {
    component: 'inference',
    repo: 'https://github.com/LowCarbCheck/openplate-inference.git',
    web: 'https://github.com/LowCarbCheck/openplate-inference',
    envRepo: 'OPENPLATE_INFERENCE_REPO',
    envRef: 'OPENPLATE_INFERENCE_REF',
  },
];

/** Where the published guides live in every one of these trees. */
const DIR = 'docs';
/** `docs/README.md` is a hub for GitHub's own directory listing, not a guide. */
const NOT_A_GUIDE = new Set(['README.md']);

const OUT = resolve('src/generated');
const IMAGES_OUT = resolve('public/docs/images');
const SOURCE_JSON = join(OUT, 'SOURCE.json');
const PUBLIC_SOURCE_JSON = resolve('public/SOURCE.json');

function fail(message: string): never {
  console.error(`sync-docs: ${message}`);
  process.exit(1);
}

/** A lookup that cannot miss, spelled so that a bug here is a message and not a crash. */
function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) fail(`${what} is missing — this is a bug in sync-docs.`);
  return value;
}

/**
 * A documentation table row.
 *
 * ── THE PATH IS NOT ALWAYS UNDER `docs/` ──
 * collie's row regex hardcodes `./docs/<slug>.md`, because every page it
 * publishes is one. openplate-sync's table has one row and it points at
 * `./PROTOCOL.md` at the repository root — the protocol IS that repository's
 * documentation. So the path is captured whole and the slug is taken from the
 * file name, which is also why the sync needs no list of extra files: a
 * document worth publishing is a document worth a row in the table that names
 * everything else.
 */
const ROW = /^\|\s*\[\*\*(?<title>[^\]]+)\*\*\]\((?<path>\.\/[\w./-]+\.md)\)\s*\|(?<blurb>.*)\|\s*$/;

interface Row {
  title: string;
  /** Repo-relative, e.g. `docs/self-hosting.md` or `PROTOCOL.md`. */
  file: string;
  slug: string;
  blurb: string;
}

function tableRows(readme: string, component: DocComponent): Row[] {
  const section = extractSection(readme, 'Documentation');
  if (section === null) {
    fail(`${component}: README has no Documentation section — nothing says which docs exist.`);
  }
  const rows: Row[] = [];
  for (const line of section.split('\n')) {
    if (!line.startsWith('|')) continue;
    const match = ROW.exec(line);
    // The header row and the `| --- |` rule are the two that legitimately do not match.
    if (match?.groups === undefined) continue;
    const file = (match.groups['path'] ?? '').replace(/^\.\//, '');
    const slug = (file.split('/').pop() ?? '').replace(/\.md$/, '').toLowerCase();
    if (!/^[a-z][\da-z-]*$/.test(slug)) {
      fail(`${component}: ${file} does not give a usable URL segment (${slug}).`);
    }
    rows.push({ title: match.groups['title'] ?? '', file, slug, blurb: (match.groups['blurb'] ?? '').trim() });
  }
  if (rows.length === 0) fail(`${component}: the Documentation table matched no rows — its shape has changed.`);
  return rows;
}

/** Every `# Title` line, and the body under it. */
function splitTitle(markdown: string, file: string) {
  const lines = markdown.split('\n');
  const at = lines.findIndex((line) => line.startsWith('# '));
  if (at === -1) fail(`${file} has no \`# \` title.`);
  return { title: lines[at]?.slice(2).trim() ?? '', body: lines.slice(at + 1).join('\n') };
}

/** `v1.2.3` as three numbers, or `null` for anything that is not a plain release tag. */
function version(tag: string): [number, number, number] | null {
  const match = /^v(\d+)\.(\d+)\.(\d+)$/.exec(tag);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function git(args: string[], cwd?: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/**
 * The highest semver tag a repository has.
 *
 * ── HIGHEST SEMVER, NOT `releases/latest`, AND NOT THE GITHUB API ──
 * GitHub's `latest` is the most recently PUBLISHED non-prerelease, which is a
 * date and not a version: publish a `v1.4.2` hotfix on an old line after
 * `v2.0.0` has shipped and the site quietly starts documenting the previous
 * major. Sorting the tags themselves cannot do that.
 *
 * collie asks the releases API for them. This asks git, which is the departure
 * the local-checkout override forces: `git ls-remote --tags` answers for a URL
 * and for a path on this disk with the same command and no token, and a source
 * that has published no release yet still resolves.
 */
function highestTag(repo: string): string | null {
  const out = git(['ls-remote', '--tags', '--refs', repo]);
  const tags = out
    .split('\n')
    .flatMap((line) => {
      const tag = /refs\/tags\/(?<tag>\S+)$/.exec(line)?.groups?.['tag'];
      return tag !== undefined && version(tag) !== null ? [tag] : [];
    })
    .toSorted((a, b) => {
      const [x, y] = [version(a) ?? [0, 0, 0], version(b) ?? [0, 0, 0]];
      return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
    });
  return tags[0] ?? null;
}

interface Worktree {
  /** A directory holding the source at the ref, and whether it is ours to delete. */
  dir: string;
  scratch: boolean;
  ref: string;
  sha: string;
  committedAt: string;
  /** The branch an edit lands on, which is never the tag the words were read from. */
  editRef: string;
}

/**
 * The source's tree, at the ref this run publishes.
 *
 * ── A LOCAL CHECKOUT IS READ WHERE IT STANDS ──
 * collie's override clones the local path at the resolved ref, which is right
 * when the local path is a mirror of the remote. It is wrong for the case this
 * override exists for: a documentation table written five minutes ago, on a
 * branch, in the checkout you are looking at. Cloning it at the highest tag
 * reads a tree from before the table existed and fails the manifest check with
 * a message about a section that is in fact right there.
 *
 * So an override that names a directory is read in place, at whatever it says
 * today, and the ref it reports is the branch it is on. Naming a ref as well
 * asks for that ref specifically, and then it is cloned like any other.
 */
function worktree(source: Source): Worktree {
  const repo = process.env[source.envRepo] ?? source.repo;
  const pinned = process.env[source.envRef] ?? '';
  const local = existsSync(join(repo, '.git'));

  if (local && pinned === '') {
    const dir = resolve(repo);
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], dir);
    const dirty = git(['status', '--porcelain'], dir) !== '';
    console.log(`sync-docs: ${source.component} — reading the checkout at ${dir} (${branch}${dirty ? ', dirty' : ''})`);
    return {
      dir,
      scratch: false,
      ref: branch,
      sha: git(['rev-parse', 'HEAD'], dir),
      committedAt: git(['log', '-1', '--format=%cs'], dir),
      editRef: branch,
    };
  }

  const ref =
    pinned === '' ? (highestTag(repo) ?? fail(`${source.component}: ${repo} has no vX.Y.Z tag to quote.`)) : pinned;
  const editRef = defaultBranch(repo);
  const dir = mkdtempSync(join(tmpdir(), `openplate-docs-${source.component}-`));
  console.log(`sync-docs: ${source.component} — cloning ${repo} at ${ref} (edits land on ${editRef})`);
  cloneAt(repo, ref, dir);
  return {
    dir,
    scratch: true,
    ref,
    sha: git(['rev-parse', 'HEAD'], dir),
    // `%cs` is the committer date as YYYY-MM-DD. A fact about the commit, so
    // re-running the sync over an unchanged source is byte-identical.
    committedAt: git(['log', '-1', '--format=%cs'], dir),
    editRef,
  };
}

/**
 * The branch an edit link should land on.
 *
 * `ls-remote --symref` and not a written-down `main`: a hardcoded branch is
 * what ships an edit button that 404s on every page the day a repository is
 * cut over. Its output is two lines and this reads the first.
 */
function defaultBranch(repo: string): string {
  const out = git(['ls-remote', '--symref', repo, 'HEAD']);
  const branch = /^ref: refs\/heads\/(?<branch>\S+)\s+HEAD$/m.exec(out)?.groups?.['branch'];
  if (branch === undefined) fail(`${repo} did not report a usable HEAD — the edit links would 404.`);
  return branch;
}

interface Synced {
  docs: ComponentDocs;
  releases: ComponentReleases;
  files: DocFile[];
  imageCount: number;
}

function syncSource(source: Source, tree: Worktree): Synced {
  const component = source.component;
  const provenance: DocSource = {
    repo: source.web,
    ref: tree.ref,
    editRef: tree.editRef,
    sha: tree.sha,
    committedAt: tree.committedAt,
  };

  const readme = readFileSync(join(tree.dir, 'README.md'), 'utf8');
  const rows = tableRows(readme, component);

  // Built BEFORE anything is parsed, because every file's links are resolved
  // against it — a doc that mentions another doc has to reach this site's copy,
  // not GitHub's.
  const routes: Record<string, string> = {};
  for (const row of rows) routes[row.file] = docRoute(component, row.slug);

  // Every guide must be in the table, and every row must have a file. A doc
  // added upstream and left out of the table would otherwise be published
  // nowhere and noticed by nobody. ADRs are excluded by living in a
  // subdirectory, and `docs/README.md` by name.
  const docsDir = join(tree.dir, DIR);
  const onDisk = (existsSync(docsDir) ? readdirSync(docsDir, { withFileTypes: true }) : [])
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && !NOT_A_GUIDE.has(entry.name))
    .map((entry) => `${DIR}/${entry.name}`)
    .toSorted();
  const listed = rows
    .map((row) => row.file)
    .filter((file) => file.startsWith(`${DIR}/`))
    .toSorted();
  if (onDisk.join() !== listed.join()) {
    console.error(`sync-docs: ${component}: the Documentation table and ${DIR}/ disagree.`);
    console.error(`  table: ${listed.join(', ')}`);
    console.error(`  disk:  ${onDisk.join(', ')}`);
    process.exit(1);
  }
  for (const row of rows) {
    if (existsSync(join(tree.dir, row.file))) continue;
    fail(`${component}: the Documentation table points at ${row.file}, which is not in the tree.`);
  }

  // Every image a doc might reference, copied whole into
  // `public/docs/images/<component>/` before a single markdown file is parsed —
  // the parse below has to check a link against something real, not trust it.
  const imagesOut = join(IMAGES_OUT, component);
  const copiedImages = syncImages(join(tree.dir, IMAGES_DIR), imagesOut);
  const imageRoute = `/docs/images/${component}`;
  const availableImages = new Set(copiedImages.map((file) => `${imageRoute}/${file}`));

  const dropped: string[] = [];
  const files: DocFile[] = [];
  const entries: DocEntry[] = [];

  for (const row of rows) {
    const dir = row.file.includes('/') ? row.file.slice(0, row.file.lastIndexOf('/')) : '';
    const base: LinkBase = { repo: source.web, sha: tree.sha, dir, routes, imageRoute };
    const { title, body } = splitTitle(readFileSync(join(tree.dir, row.file), 'utf8'), row.file);
    const parsed = parseBlocks(body, base);
    dropped.push(...parsed.dropped.map((line) => `${row.file}: ${line}`));

    // A doc pointing at an image that is not in the tree just copied is a page
    // with a hole in it, and it fails the same way a missing row does — loudly,
    // not as a broken <img> a reader has to notice for us.
    for (const block of parsed.blocks) {
      if (block.kind !== 'image') continue;
      if (availableImages.has(block.src)) continue;
      fail(`${component}: ${row.file} references ${block.src}, which is not in ${IMAGES_DIR}/.`);
    }

    files.push({ component, slug: row.slug, file: row.file, title, blocks: parsed.blocks });
    // The blurb is the README's own words for what the file is for, so the
    // site's docs nav is not written here either.
    entries.push({ slug: row.slug, file: row.file, title: row.title, blurb: parseInline(row.blurb, base) });
    console.log(`sync-docs: ${component}/${row.slug} — "${title}", ${parsed.blocks.length} blocks`);
  }

  if (dropped.length > 0) console.log(`sync-docs: ${component} dropped —\n  ${dropped.join('\n  ')}`);
  if (copiedImages.length > 0) console.log(`sync-docs: ${component} — ${copiedImages.length} images into ${imagesOut}`);

  return {
    docs: { component, source: provenance, entries },
    releases: readReleases(source, tree, provenance, { repo: source.web, sha: tree.sha, dir: '', routes, imageRoute }),
    files,
    imageCount: copiedImages.length,
  };
}

/**
 * The component's CHANGELOG, or an empty page.
 *
 * A MISSING CHANGELOG IS NOT A FAILURE, unlike a missing guide. A guide is
 * promised by a table row; a changelog is promised by nothing, and
 * openplate-inference has not written its first one yet. The page exists either
 * way — the route is generated from the component list, not from what happens
 * to have notes — and it says so.
 */
function readReleases(source: Source, tree: Worktree, provenance: DocSource, base: LinkBase): ComponentReleases {
  const file = join(tree.dir, 'CHANGELOG.md');
  if (!existsSync(file)) {
    console.log(
      `sync-docs: ${source.component} — no CHANGELOG.md, ${source.component}'s release notes page will be empty.`,
    );
    return { component: source.component, source: provenance, releases: [] };
  }
  const parsed = parseChangelog(readFileSync(file, 'utf8'), base);
  if (parsed.skipped.length > 0) {
    console.log(
      `sync-docs: ${source.component} CHANGELOG headings that are not releases — ${parsed.skipped.join(', ')}`,
    );
  }
  if (parsed.dropped.length > 0) {
    console.log(`sync-docs: ${source.component} CHANGELOG dropped —\n  ${parsed.dropped.join('\n  ')}`);
  }
  console.log(`sync-docs: ${source.component} — ${parsed.releases.length} releases`);
  return { component: source.component, source: provenance, releases: parsed.releases };
}

const BANNER = '// GENERATED by `pnpm sync:docs` — do not edit.';

function write(file: string, body: string): void {
  mkdirSync(join(file, '..'), { recursive: true });
  writeFileSync(file, body);
}

interface SourceStamp {
  repo: string;
  ref: string;
  commit: string;
  syncedAt: string;
}

interface SourceStamps {
  app: SourceStamp;
  sync: SourceStamp;
  inference: SourceStamp;
}

/**
 * `SOURCE.json`, with the timestamp of the run kept OUT of the diff when
 * nothing else moved.
 *
 * The site serves this file so a deploy can be told apart from the one before
 * it, which is what spec 05 polls. That means it carries a wall-clock time, and
 * a wall-clock time written on every run makes the pre-push check — run the
 * sync, fail on any diff under `src/generated/` — fail on every clean tree.
 * So each component's `syncedAt` is only refreshed when something else about
 * that component changed. It answers "when did this text last move", which is
 * the question anybody reading it actually has.
 */
function stampSources(stamps: SourceStamps): SourceStamps {
  if (!existsSync(SOURCE_JSON)) return stamps;
  // SAFETY: our own generated file, whose shape is `SourceStamps` and is
  // rewritten by this function on every run. A file that is not that shape
  // reads as a component with no previous stamp and gets a fresh one.
  const previous = JSON.parse(readFileSync(SOURCE_JSON, 'utf8')) as Partial<SourceStamps>;
  const kept = { ...stamps };
  for (const component of ['app', 'sync', 'inference'] as const) {
    const before = previous[component];
    const now = kept[component];
    if (before === undefined) continue;
    if (before.repo !== now.repo || before.ref !== now.ref || before.commit !== now.commit) continue;
    kept[component] = { ...now, syncedAt: before.syncedAt };
  }
  return kept;
}

const trees = new Map<DocComponent, Worktree>();
try {
  const synced = new Map<DocComponent, Synced>();
  for (const source of SOURCES) {
    const tree = worktree(source);
    trees.set(source.component, tree);
    synced.set(source.component, syncSource(source, tree));
  }

  rmSync(join(OUT, 'docs'), { recursive: true, force: true });
  rmSync(join(OUT, 'releases'), { recursive: true, force: true });

  const imports: string[] = [];
  const registry: string[] = [];
  const index: string[] = [];
  const stamps = new Map<DocComponent, SourceStamp>();
  const syncedAt = new Date().toISOString();

  for (const source of SOURCES) {
    const component = source.component;
    const result = required(synced.get(component), `${component}'s sync result`);
    const tree = required(trees.get(component), `${component}'s worktree`);

    const pages: string[] = [];
    for (const doc of result.files) {
      write(
        join(OUT, 'docs', component, `${doc.slug}.ts`),
        `${BANNER}\n//\n// ${source.web}'s ${doc.file} at ${tree.sha.slice(0, 12)},\n` +
          `// parsed into the block tree in app/lib/docs.ts.\n` +
          `import type { DocFile } from '../../../../app/lib/docs';\n\n` +
          `export const DOC: DocFile = ${JSON.stringify(doc, null, 2)};\n`,
      );
      const symbol = `${component}_${doc.slug.replaceAll('-', '_')}`;
      imports.push(`import { DOC as ${symbol} } from './docs/${component}/${doc.slug}';`);
      pages.push(`    '${doc.slug}': ${symbol},`);
    }
    registry.push(`  ${component}: {\n${pages.join('\n')}\n  },`);

    index.push(`  ${component}: ${JSON.stringify(result.docs, null, 2).replaceAll('\n', '\n  ')},`);

    write(
      join(OUT, 'releases', `${component}.ts`),
      `${BANNER}\n//\n// ${source.web}'s CHANGELOG.md at ${tree.sha.slice(0, 12)}.\n` +
        `import type { ComponentReleases } from '../../../app/lib/docs';\n\n` +
        `export const RELEASES: ComponentReleases = ${JSON.stringify(result.releases, null, 2)};\n`,
    );

    stamps.set(component, { repo: source.web, ref: tree.ref, commit: tree.sha, syncedAt });
  }

  write(
    join(OUT, 'docs-index.ts'),
    `${BANNER}\n//\n// Each repository's README documentation table, in the README's order.\n` +
      `// The pages themselves are one module each under ./docs/.\n` +
      `import type { DocsIndex } from '../../app/lib/docs';\n\n` +
      `export const DOCS_INDEX: DocsIndex = {\n${index.join('\n')}\n};\n`,
  );

  write(
    join(OUT, 'docs-registry.ts'),
    `${BANNER}\n//\n// Every documentation page, by component and slug.\n` +
      `//\n` +
      `// Imported by route LOADERS and by nothing a browser runs: React Router\n` +
      `// strips a loader from the client bundle, so a reader who opens one page\n` +
      `// downloads that page and not the other fourteen.\n` +
      `import type { DocsRegistry } from '../../app/lib/docs';\n` +
      `${imports.join('\n')}\n\n` +
      `export const DOCS: DocsRegistry = {\n${registry.join('\n')}\n};\n`,
  );

  write(
    join(OUT, 'releases-registry.ts'),
    `${BANNER}\n//\n// Every component's release notes, by component.\n` +
      `import type { ReleasesRegistry } from '../../app/lib/docs';\n` +
      SOURCES.map(
        (source) => `import { RELEASES as ${source.component}Releases } from './releases/${source.component}';`,
      ).join('\n') +
      `\n\nexport const RELEASES: ReleasesRegistry = {\n` +
      SOURCES.map((source) => `  ${source.component}: ${source.component}Releases,`).join('\n') +
      `\n};\n`,
  );

  const stamped = stampSources({
    app: required(stamps.get('app'), "app's stamp"),
    sync: required(stamps.get('sync'), "sync's stamp"),
    inference: required(stamps.get('inference'), "inference's stamp"),
  });
  const json = `${JSON.stringify(stamped, null, 2)}\n`;
  write(SOURCE_JSON, json);
  // The same bytes under `public/`, which is what the site actually serves at
  // `/SOURCE.json`. Copied rather than symlinked: the build copies `public/`
  // into `build/client/`, and a symlink out of it is not a file a static server
  // can serve.
  write(PUBLIC_SOURCE_JSON, json);

  const pageCount = [...synced.values()].reduce((total, result) => total + result.files.length, 0);
  console.log(`sync-docs: ${pageCount} pages into ${OUT}`);
} finally {
  for (const tree of trees.values()) {
    if (tree.scratch) rmSync(tree.dir, { recursive: true, force: true });
  }
}
