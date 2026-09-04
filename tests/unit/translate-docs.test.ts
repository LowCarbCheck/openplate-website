/**
 * The three things that must be true of a paid translation run: the markup
 * survives the round trip, an edit costs one sentence, and an unchanged
 * sentence costs nothing.
 *
 * ── THE FETCH IS A STUB, THE PIPELINE IS NOT ──
 * `translate` reads its endpoint from `OPENROUTER_ENDPOINT`, and `fetch` is
 * replaced here with a counter. Everything between the block tree and the
 * request body is the code the real run uses: the same templating, the same
 * hashes, the same chunking, the same marker and dash checks at the door. What
 * is faked is the model, which is the one part no test can assert anything
 * about.
 */
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { type Unit, collectDoc, hash, rebuild, template, withChildren } from '../../app/lib/docs-i18n.server';
import type { DocFile, Inline } from '../../app/lib/docs';
import { CHUNK, chunk, dashOffenders, fill, missesOf } from '../../scripts/lib/translate';

/** "Set `SYNC_URL` to 8080, see the [protocol](/docs/sync/protocol)." */
const RUN: Inline[] = [
  { kind: 'text', text: 'Set ' },
  { kind: 'code', text: 'SYNC_URL' },
  { kind: 'text', text: ' to 8080, see the ' },
  { kind: 'link', spans: [{ kind: 'text', text: 'protocol' }], href: '/docs/sync/protocol' },
  { kind: 'text', text: '.' },
];

function doc(paragraph: string): DocFile {
  return {
    component: 'sync',
    slug: 'protocol',
    file: 'PROTOCOL.md',
    title: 'openplate sync protocol',
    blocks: [
      { kind: 'heading', level: 2, text: 'Keys', id: 'keys', spans: [{ kind: 'text', text: 'Keys' }] },
      { kind: 'paragraph', spans: [{ kind: 'text', text: paragraph }] },
      { kind: 'paragraph', spans: RUN },
      { kind: 'code', lang: 'sh', text: 'pnpm dev --port 8080' },
    ],
  };
}

function unitsOf(page: DocFile): Map<string, Unit> {
  const units = new Map<string, Unit>();
  collectDoc(page, units);
  return units;
}

describe('the template', () => {
  it('replaces every non-text span with a numbered marker and keeps the words', () => {
    const { text, children } = template(RUN);
    assert.equal(text, 'Set {{0}} to 8080, see the {{1}}.');
    assert.equal(children.length, 2);
  });

  it('rebuilds a run byte-identically when nothing is translated', () => {
    assert.deepEqual(rebuild(RUN, new Map()), RUN);
  });

  it('keeps a code span, a link target and a number byte-identical when the markers move', () => {
    const { text } = template(RUN);
    // German puts the reference first and the setting last: both markers move,
    // and neither may change.
    const german = 'Siehe das {{1}}, setze {{0}} auf 8080.';
    const spans = rebuild(RUN, new Map([[hash(text), german]]));

    const code = spans.find((span) => span.kind === 'code');
    const link = spans.find((span) => span.kind === 'link');
    assert.deepEqual(code, { kind: 'code', text: 'SYNC_URL' });
    assert.deepEqual(link, { kind: 'link', spans: [{ kind: 'text', text: 'protocol' }], href: '/docs/sync/protocol' });
    assert.equal(
      spans.filter((span) => span.kind === 'text').some((span) => span.text.includes('8080')),
      true,
    );
    // The link arrives before the code span, which is the whole reason a marker
    // is a marker rather than a position.
    assert.ok(spans.indexOf(link!) < spans.indexOf(code!));
  });

  it('falls back to the English when the answer lost a marker', () => {
    const { text } = template(RUN);
    const spans = rebuild(RUN, new Map([[hash(text), 'Siehe das {{1}}.']]));
    assert.deepEqual(spans, RUN);
  });

  it('puts the children back in the template order', () => {
    const { text, children } = template(RUN);
    assert.deepEqual(withChildren(text, children), RUN);
  });
});

describe('the memory', () => {
  it('gives an edited sentence a new hash and leaves its neighbours alone', () => {
    const first = unitsOf(doc('Every device holds its own key.'));
    const second = unitsOf(doc('Every device holds its own key pair.'));

    const done = new Map([...first.keys()].map((key) => [key, 'de']));
    const misses = missesOf(second, done);

    assert.equal(first.size, second.size);
    assert.equal(misses.length, 1);
    assert.equal(misses[0]?.source, 'Every device holds its own key pair.');
  });

  it('names the hash of a translation carrying a banned dash', () => {
    const offenders = dashOffenders(
      {
        aaaa: { en: 'A key, not a password.', model: 'm', at: '2026-09-04', de: 'Ein Schlüssel, kein Passwort.' },
        bbbb: { en: 'A key, not a password.', model: 'm', at: '2026-09-04', de: 'Ein Schlüssel — kein Passwort.' },
      },
      'de',
    );
    assert.deepEqual(offenders, ['bbbb']);
  });
});

describe('a run', () => {
  let calls = 0;
  let sent: string[] = [];
  const real = globalThis.fetch;

  before(() => {
    globalThis.fetch = async (_input, init) => {
      calls += 1;
      // SAFETY: the test is the only caller, and it always sends a JSON string
      // body built by `translate` two lines above the request.
      const body = JSON.parse(String(init?.body)) as { messages: { content: string }[] };
      const asked = body.messages[1]?.content ?? '';
      // SAFETY: `translate` puts `{"en": [...]}` on the last line of the user
      // message. Built by the code under test, parsed here.
      const payload = JSON.parse(asked.slice(asked.lastIndexOf('\n') + 1)) as { en: string[] };
      sent = payload.en;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ de: payload.en.map((one) => `DE ${one}`) }) } }],
          usage: { prompt_tokens: 1, completion_tokens: 1, cost: 0.000_01 },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
  });

  after(() => {
    globalThis.fetch = real;
  });

  it('sends nothing when the memory answers every sentence', async () => {
    const units = unitsOf(doc('Every device holds its own key.'));
    const done = new Map([...units.entries()].map(([key, unit]) => [key, `DE ${unit.source}`]));

    calls = 0;
    const batches = chunk(missesOf(units, done), CHUNK);
    for (const batch of batches)
      await fill(batch, 'de', 'test-key', done, { prompt_tokens: 0, completion_tokens: 0, cost: 0 });

    assert.equal(batches.length, 0);
    assert.equal(calls, 0);
  });

  it('sends only the sentence that changed, and stores what comes back', async () => {
    const units = unitsOf(doc('Every device holds its own key.'));
    const done = new Map([...units.entries()].map(([key, unit]) => [key, `DE ${unit.source}`]));
    const edited = unitsOf(doc('Every device holds its own key pair.'));

    calls = 0;
    const misses = missesOf(edited, done);
    for (const batch of chunk(misses, CHUNK)) {
      await fill(batch, 'de', 'test-key', done, { prompt_tokens: 0, completion_tokens: 0, cost: 0 });
    }

    assert.equal(calls, 1);
    assert.deepEqual(sent, ['Every device holds its own key pair.']);
    assert.equal(done.get(hash('Every device holds its own key pair.')), 'DE Every device holds its own key pair.');
  });
});
