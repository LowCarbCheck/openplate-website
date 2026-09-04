/**
 * serve-static — a dependency-free static file server for `build/client`.
 *
 * Runs the site's own prerendered output for local review, e.g. from the
 * umbrella's `make site` / `make site-up` targets. No dependency on `serve`,
 * `sirv` or the framework's own preview server: `build/client` is plain
 * files, and Node's http module plus `node:fs` is enough to serve them.
 *
 * Run with `node --experimental-strip-types scripts/serve-static.ts`.
 *
 *   PORT=5200 HOST=127.0.0.1 node --experimental-strip-types scripts/serve-static.ts
 */
import { createServer } from 'node:http';
import { existsSync, statSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
} as const satisfies Record<string, string>;

function contentTypeFor(path: string): string {
  // SAFETY: extname() output only ever indexes CONTENT_TYPES or misses; the
  // lookup itself, not this cast, is what decides the fallback below.
  const extension = extname(path) as keyof typeof CONTENT_TYPES;
  return CONTENT_TYPES[extension] ?? 'application/octet-stream';
}

/** Resolves a request path to a file under root, honoring directory index.html. */
export function resolveStaticPath(root: string, requestPath: string): string | null {
  const decoded = decodeURIComponent(requestPath.split('?')[0] ?? '/');
  const candidate = resolve(join(root, decoded));

  if (!candidate.startsWith(root)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;

  const asDirectory = join(candidate, 'index.html');
  if (existsSync(asDirectory)) return asDirectory;

  return null;
}

/** True when `requestPath` names a directory that would resolve via index.html. */
export function isDirectoryNeedingSlash(root: string, requestPath: string): boolean {
  if (requestPath.endsWith('/')) return false;
  const decoded = decodeURIComponent(requestPath.split('?')[0] ?? '/');
  const candidate = resolve(join(root, decoded));
  if (!candidate.startsWith(root)) return false;
  return existsSync(candidate) && statSync(candidate).isDirectory();
}

export function createStaticServer(root: string) {
  return createServer((req, res) => {
    const requestPath = req.url ?? '/';

    if (isDirectoryNeedingSlash(root, requestPath)) {
      const query = requestPath.includes('?') ? requestPath.slice(requestPath.indexOf('?')) : '';
      res.writeHead(301, { Location: `${requestPath.split('?')[0]}/${query}` });
      res.end();
      return;
    }

    const filePath = resolveStaticPath(root, requestPath);
    if (!filePath) {
      void serveNotFound(root, res);
      return;
    }

    readFile(filePath)
      .then((body) => {
        res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
        res.end(body);
        return undefined;
      })
      .catch(() => serveNotFound(root, res));
  });
}

async function serveNotFound(root: string, res: import('node:http').ServerResponse): Promise<void> {
  const notFoundPage = join(root, '404.html');
  if (existsSync(notFoundPage)) {
    const body = await readFile(notFoundPage);
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not found');
}

function main(): void {
  const root = resolve(join(import.meta.dirname, '..', 'build', 'client'));
  const port = Number(process.env.PORT ?? 5200);
  const host = process.env.HOST ?? '127.0.0.1';

  if (!existsSync(root)) {
    throw new Error(`${root} does not exist. Run "pnpm build" first.`);
  }

  const server = createStaticServer(root);
  server.listen(port, host, () => {
    console.log(`serve-static: http://${host}:${port}/ (${root})`);
  });
}

const isMain = process.argv[1] === new URL(import.meta.url).pathname;
if (isMain) {
  main();
}
