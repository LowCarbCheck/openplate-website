/**
 * serve-static's routing rules: directory index, the trailing-slash
 * redirect, a missing path, and the content type for a known extension.
 * A real HTTP server on an ephemeral port, against a throwaway fixture tree,
 * since the rules live in how `node:http` request/response objects are used.
 */
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import type { Server } from 'node:http';

import { createStaticServer } from '../../scripts/serve-static';

let root: string;
let server: Server;
let baseUrl: string;

before(async () => {
  root = mkdtempSync(join(tmpdir(), 'serve-static-'));
  writeFileSync(join(root, 'index.html'), '<html>home</html>');
  writeFileSync(join(root, 'SOURCE.json'), '{"ok":true}');
  mkdirSync(join(root, 'de'));
  writeFileSync(join(root, 'de', 'index.html'), '<html lang="de">de</html>');

  server = createStaticServer(root);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (address === null) {
    throw new Error('server did not bind to a port');
  }
  // SAFETY: listen() was called with a hostname, so the socket is a TCP
  // socket and address() returns an AddressInfo, never the pipe-name string.
  const { port } = address as { port: number };
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(root, { recursive: true, force: true });
});

describe('createStaticServer', () => {
  it('serves the directory index at /', async () => {
    const response = await fetch(`${baseUrl}/`);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), '<html>home</html>');
  });

  it('redirects a directory path with no trailing slash', async () => {
    const response = await fetch(`${baseUrl}/de`, { redirect: 'manual' });
    assert.equal(response.status, 301);
    assert.equal(response.headers.get('location'), '/de/');
  });

  it('answers 404 for a missing path with no 404.html present', async () => {
    const response = await fetch(`${baseUrl}/nope`);
    assert.equal(response.status, 404);
  });

  it('reports application/json for a .json file', async () => {
    const response = await fetch(`${baseUrl}/SOURCE.json`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') ?? '', /^application\/json/);
  });
});
