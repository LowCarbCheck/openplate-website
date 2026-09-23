/**
 * openplate.de used to serve the app itself. The app moved to beta.openplate.de (M194) and
 * registered a service worker there that answers every image request cache-first, with no expiry.
 * Until this fix, `nginx.conf` answered every old app path, including `/sw.js`, with a 301 to
 * beta.openplate.de. A browser never follows a redirect when it checks a service worker for an
 * update, so that 301 kept the old worker installed on openplate.de, and it kept serving the
 * pre-redesign screenshots to anyone who had used the app there before the cutover.
 *
 * `public/sw.js` is the fix: a kill switch. A browser still running the old worker fetches it on
 * its next update check, installs it, and it clears every cache on the origin and unregisters
 * itself. `nginx.conf` now answers `location = /sw.js` with that file instead of the redirect,
 * `no-cache` so an update check always reaches the current version of it.
 *
 * The fix was already proved once in a real browser. These are the checks that keep it from
 * regressing. Every matcher here has a control case that feeds it the thing it exists to catch,
 * because a matcher that cannot find anything passes against any tree.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { describe, it } from 'node:test';

const ROOT = resolve(import.meta.dirname, '../..');
const NGINX_CONF = readFileSync(resolve(ROOT, 'nginx.conf'), 'utf8');
const SW_PATH = resolve(ROOT, 'public/sw.js');

// ---------------------------------------------------------------------------
// nginx.conf: block parsing by brace depth, never by line
// ---------------------------------------------------------------------------

interface Block {
  readonly selector: string;
  readonly body: string;
}

/**
 * Every top-level `<keyword> <selector> { ... }` block in `text`, matched by counting braces so a
 * block nested inside another (a `location` inside a `server`) never ends the outer block early.
 */
function blocksNamed(text: string, keyword: string): Block[] {
  const header = new RegExp(`(?:^|\\n)[ \\t]*${keyword}[ \\t]*([^{\\n]*)\\{`, 'g');
  const blocks: Block[] = [];
  for (let match = header.exec(text); match !== null; match = header.exec(text)) {
    const selector = (match[1] ?? '').trim();
    const bodyStart = match.index + match[0].length;
    let depth = 1;
    let end = bodyStart;
    while (depth > 0) {
      assert.ok(end < text.length, `a "${keyword} ${selector}" block never closes`);
      if (text[end] === '{') depth += 1;
      if (text[end] === '}') depth -= 1;
      end += 1;
    }
    blocks.push({ selector, body: text.slice(bodyStart, end - 1) });
  }
  return blocks;
}

/** Does a location `body` answer with an nginx redirect: `return 30x`, or `rewrite ... permanent`? */
function blockRedirects(body: string): boolean {
  return /return\s+3\d\d\b/.test(body) || /rewrite\s+\S+\s+\S+\s+permanent\b/.test(body);
}

/** Does a location `body` set `no-cache` (in a header value, quoted or not)? */
function blockIsNoCache(body: string): boolean {
  return /no-cache/.test(body);
}

/**
 * Does nginx location `selector` (the text between the `location` keyword and its `{`, e.g.
 * `= /sw.js`, `^~ /join`, `~ ^/imprint/?$`, or a bare prefix like `/`) match request path `path`?
 * Enough of nginx's matching rules to answer "would this location ever see a request for `path`",
 * which is all a false negative here would hide.
 */
function locationMatchesPath(selector: string, path: string): boolean {
  if (selector.startsWith('= ')) return selector.slice(2).trim() === path;
  if (selector.startsWith('^~ ')) return path.startsWith(selector.slice(3).trim());
  if (selector.startsWith('~* ')) return new RegExp(selector.slice(3).trim(), 'i').test(path);
  if (selector.startsWith('~ ')) return new RegExp(selector.slice(2).trim()).test(path);
  return path.startsWith(selector.trim());
}

/** The `location` blocks inside the `server_name openplate.de` block of `conf`. */
function appServerLocations(conf: string): Block[] {
  const appServer = blocksNamed(conf, 'server').find((block) => block.body.includes('server_name openplate.de;'));
  assert.ok(appServer, 'nginx.conf has no server_name openplate.de block');
  return blocksNamed(appServer.body, 'location');
}

/** The `location = /sw.js` block inside the `server_name openplate.de` block of `conf`. */
function swLocation(conf: string): Block {
  const location = appServerLocations(conf).find((block) => block.selector === '= /sw.js');
  assert.ok(location, 'no "location = /sw.js" block in the openplate.de server');
  return location;
}

describe('nginx location-selector matching (the matcher the /sw.js scan relies on)', () => {
  const cases: { selector: string; path: string; expected: boolean }[] = [
    { selector: '= /sw.js', path: '/sw.js', expected: true },
    { selector: '= /sw.js', path: '/sw.js2', expected: false },
    { selector: '^~ /join', path: '/sw.js', expected: false },
    { selector: '^~ /s', path: '/sw.js', expected: true },
    { selector: '~ ^/sw\\.js$', path: '/sw.js', expected: true },
    { selector: '~ ^/(?:en|fr)/imprint/?$', path: '/sw.js', expected: false },
    { selector: '/', path: '/sw.js', expected: true },
    { selector: '/assets/', path: '/sw.js', expected: false },
  ];

  for (const testCase of cases) {
    const verb = testCase.expected ? 'matches' : 'does not match';
    it(`"${testCase.selector}" ${verb} "${testCase.path}"`, () => {
      assert.equal(locationMatchesPath(testCase.selector, testCase.path), testCase.expected);
    });
  }
});

describe('the /sw.js location in nginx.conf', () => {
  it('exists as an exact-match location in the openplate.de server', () => {
    assert.equal(swLocation(NGINX_CONF).selector, '= /sw.js');
  });

  it('answers with the file, not a redirect', () => {
    assert.equal(blockRedirects(swLocation(NGINX_CONF).body), false, swLocation(NGINX_CONF).body);
  });

  it('is served no-cache, so every update check reaches the current file', () => {
    assert.equal(blockIsNoCache(swLocation(NGINX_CONF).body), true, swLocation(NGINX_CONF).body);
  });

  it('control: the same reader sees the pre-fix redirect as a redirect, and as not no-cache', () => {
    const before = [
      'server {',
      '    server_name openplate.de;',
      '    location = /sw.js { return 301 https://beta.openplate.de$request_uri; }',
      '}',
    ].join('\n');
    const block = swLocation(before);
    assert.equal(blockRedirects(block.body), true);
    assert.equal(blockIsNoCache(block.body), false);
  });

  it('no other location in the openplate.de server would answer /sw.js with a redirect', () => {
    const matching = appServerLocations(NGINX_CONF).filter((block) => locationMatchesPath(block.selector, '/sw.js'));
    // The exact match and the generic catch-all both see this path. Pinning the count means the
    // control below (a planted redirecting location) is provably exercising the same filter, not
    // an empty one that would pass by finding nothing.
    assert.ok(matching.length >= 2, `expected at least 2 locations to match /sw.js, found ${matching.length}`);
    for (const block of matching) {
      assert.equal(blockRedirects(block.body), false, `location ${block.selector} redirects /sw.js`);
    }
  });

  it('control: a prefix or regex location that would catch /sw.js is caught when it redirects', () => {
    const brokenPrefix: Block = { selector: '^~ /s', body: ' return 301 https://elsewhere.example$request_uri; ' };
    const brokenRegex: Block = { selector: '~ ^/sw\\.js$', body: ' return 302 https://elsewhere.example; ' };
    const untouched: Block = { selector: '^~ /join', body: ' return 301 https://beta.openplate.de$request_uri; ' };

    assert.equal(locationMatchesPath(brokenPrefix.selector, '/sw.js'), true);
    assert.equal(blockRedirects(brokenPrefix.body), true);

    assert.equal(locationMatchesPath(brokenRegex.selector, '/sw.js'), true);
    assert.equal(blockRedirects(brokenRegex.body), true);

    // A control for the filter itself: a real redirecting location that does NOT match /sw.js
    // must not be swept in, or the check above would pass by accident on any redirect at all.
    assert.equal(locationMatchesPath(untouched.selector, '/sw.js'), false);
  });
});

// ---------------------------------------------------------------------------
// public/sw.js: what the kill switch does, read as text, never executed
// ---------------------------------------------------------------------------

function callsSkipWaiting(text: string): boolean {
  return /\bskipWaiting\s*\(/.test(text);
}

function deletesEveryCache(text: string): boolean {
  return /caches\.keys\s*\(/.test(text) && /caches\.delete\s*\(/.test(text);
}

function unregistersItself(text: string): boolean {
  return /registration\.unregister\s*\(/.test(text);
}

function addsFetchListener(text: string): boolean {
  return /addEventListener\(\s*['"]fetch['"]/.test(text);
}

describe('the kill switch at public/sw.js', () => {
  it('exists', () => {
    assert.ok(existsSync(SW_PATH), 'public/sw.js is missing');
  });

  it('calls skipWaiting, so it takes over without waiting for old tabs to close', () => {
    assert.equal(callsSkipWaiting(readFileSync(SW_PATH, 'utf8')), true);
  });

  it('deletes every cache: lists the names, then deletes each one', () => {
    assert.equal(deletesEveryCache(readFileSync(SW_PATH, 'utf8')), true);
  });

  it('unregisters itself once it has cleared the caches', () => {
    assert.equal(unregistersItself(readFileSync(SW_PATH, 'utf8')), true);
  });

  it('adds no fetch listener, so it never becomes a new cache itself', () => {
    assert.equal(addsFetchListener(readFileSync(SW_PATH, 'utf8')), false);
  });

  it('control: each matcher finds the thing it exists to catch, and nothing else', () => {
    assert.equal(callsSkipWaiting('self.oninstall = () => {};'), false);
    assert.equal(callsSkipWaiting('self.skipWaiting();'), true);

    assert.equal(deletesEveryCache('const names = await caches.keys();'), false);
    assert.equal(deletesEveryCache('await caches.delete(name);'), false);
    assert.equal(deletesEveryCache('const names = await caches.keys(); await caches.delete(names[0]);'), true);

    assert.equal(unregistersItself('self.registration.update();'), false);
    assert.equal(unregistersItself('await self.registration.unregister();'), true);

    assert.equal(addsFetchListener("self.addEventListener('install', () => {});"), false);
    assert.equal(addsFetchListener("self.addEventListener('fetch', (event) => {});"), true);
  });
});

// ---------------------------------------------------------------------------
// app/: nothing here registers a service worker; only public/sw.js unregisters one
// ---------------------------------------------------------------------------

function registersServiceWorker(text: string): boolean {
  return /serviceWorker\??\.register\s*\(/.test(text);
}

/** Every `.ts`/`.tsx` file under `dir`, walked recursively. */
function sourceFilesUnder(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(full);
    return extname(entry.name) === '.ts' || extname(entry.name) === '.tsx' ? [full] : [];
  });
}

describe('service worker registration', () => {
  const files = sourceFilesUnder(resolve(ROOT, 'app'));

  it('walked more than a handful of app source files, so an empty result is not a broken walk', () => {
    assert.ok(files.length > 20, `only ${files.length} files found under app/`);
  });

  it('registers no service worker anywhere under app/', () => {
    const offenders = files.filter((file) => registersServiceWorker(readFileSync(file, 'utf8')));
    assert.deepEqual(offenders, []);
  });

  it('control: the matcher finds a planted registration, direct or optionally-chained', () => {
    assert.equal(registersServiceWorker("navigator.serviceWorker.register('/sw.js');"), true);
    assert.equal(registersServiceWorker("navigator.serviceWorker?.register('/sw.js');"), true);
    assert.equal(registersServiceWorker('// this file used to call the registration API'), false);
  });
});
