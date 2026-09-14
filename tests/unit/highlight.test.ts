/**
 * The code fence tokenizer.
 *
 * The round trip matters most: a reader copies these commands into a shell,
 * and a tokenizer that drops or repeats a character shows a command the docs
 * never wrote while looking perfectly normal.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { DOC_COMPONENTS, type Block } from '../../app/lib/docs';
import { highlight } from '../../app/lib/highlight';
import { DOCS } from '../../src/generated/docs-registry';

/** The first line's tokens as `kind:text`, for readable assertions. */
function line(code: string, lang: string): string[] {
  return (highlight({ code, lang })[0] ?? []).map((token) => `${token.kind}:${token.text}`);
}

function roundTrip(code: string, lang: string): string {
  return highlight({ code, lang })
    .map((tokens) => tokens.map((token) => token.text).join(''))
    .join('\n');
}

/** Every fence in a block tree, including the ones nested under list items. */
function fences(blocks: Block[]): { lang: string; text: string }[] {
  return blocks.flatMap((block) => {
    if (block.kind === 'code') return [{ lang: block.lang, text: block.text }];
    if (block.kind === 'list') return (block.nested ?? []).flatMap((entry) => fences(entry.blocks));
    return [];
  });
}

describe('highlight', () => {
  it('gives back every published fence character for character', () => {
    const corpus = DOC_COMPONENTS.flatMap((component) =>
      Object.keys(DOCS[component]).flatMap((slug) => fences(DOCS[component][slug]?.blocks ?? [])),
    );
    assert.ok(corpus.length > 20, `expected the synced corpus, found ${corpus.length} fences`);
    for (const fence of corpus) assert.equal(roundTrip(fence.text, fence.lang), fence.text);
  });

  it('keeps blank lines and unterminated quotes intact', () => {
    for (const [code, lang] of [
      ['echo "unterminated', 'bash'],
      ['\n\n', 'bash'],
      ['{ "a": "b\\"c" }', 'json'],
      ['key = "open', 'toml'],
    ] as const) {
      assert.equal(roundTrip(code, lang), code);
    }
  });

  it('marks shell comments, strings, variables, keys and flags', () => {
    assert.deepEqual(line('OPENPLATE_PORT=3000 pnpm start --host "$HOST" # local', 'bash'), [
      'key:OPENPLATE_PORT',
      'plain:=3000 pnpm start ',
      'flag:--host',
      'plain: ',
      'string:"$HOST"',
      'plain: ',
      'comment:# local',
    ]);
    assert.deepEqual(line('echo $HOME', 'bash'), ['plain:echo ', 'variable:$HOME']);
  });

  it('opens a comment only at a word boundary', () => {
    // Control: the same `#` after a space is a comment, so the rule is doing the work.
    assert.deepEqual(line('nix build .#app', 'bash'), ['plain:nix build .#app']);
    assert.deepEqual(line('nix build . #app', 'bash'), ['plain:nix build . ', 'comment:#app']);
  });

  it('reads a prompt only in a console transcript, and leaves its output plain', () => {
    assert.deepEqual(line('$ pnpm dev', 'console'), ['prompt:$ ', 'plain:pnpm dev']);
    assert.deepEqual(line("it's running", 'console'), ["plain:it's running"]);
    assert.deepEqual(line('$ pnpm dev', 'bash'), ['plain:$ pnpm dev']);
  });

  it('tells a JSON key from a JSON string value', () => {
    assert.deepEqual(line('  "port": "3000",', 'json'), ['plain:  ', 'key:"port"', 'plain:: ', 'string:"3000"', 'plain:,']);
    assert.deepEqual(line('"a": 1 // why', 'jsonc'), ['key:"a"', 'plain:: 1 ', 'comment:// why']);
  });

  it('marks TOML sections, keys and comments', () => {
    assert.deepEqual(line('[server]', 'toml'), ['section:[server]']);
    assert.deepEqual(line('port = 8080 # default', 'toml'), ['key:port ', 'plain:= 8080 ', 'comment:# default']);
  });

  it('leaves an unknown or missing language plain', () => {
    assert.deepEqual(line('export const a = "b";', 'typescript'), ['plain:export const a = "b";']);
    assert.deepEqual(line('--flag "x"', ''), ['plain:--flag "x"']);
  });
});
