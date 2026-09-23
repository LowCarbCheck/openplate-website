/**
 * The two pure halves of the docs' search and copy features: a Pagefind excerpt read as text runs,
 * and what the copy button puts on the clipboard.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { copyableText } from '../../app/lib/copyable-text';
import { excerptParts, sitePath } from '../../app/lib/pagefind';

describe('excerptParts', () => {
  it('splits on <mark> and marks only the runs inside it', () => {
    assert.deepEqual(excerptParts('run the <mark>sync</mark> server'), [
      { text: 'run the ', isMatch: false, at: 0 },
      { text: 'sync', isMatch: true, at: 8 },
      { text: ' server', isMatch: false, at: 12 },
    ]);
  });

  it('decodes the escapes Pagefind writes, once', () => {
    const parts = excerptParts('a &lt;b&gt; &amp;amp; <mark>&quot;c&#39;</mark>');
    assert.deepEqual(
      parts.map((part) => part.text),
      ['a <b> &amp; ', '"c\''],
    );
  });

  it('renders no markup it was given', () => {
    // Control: an excerpt carrying a tag other than <mark> must come back as its text alone.
    const text = excerptParts('<script>x</script>y <mark>z</mark>')
      .map((part) => part.text)
      .join('');
    assert.equal(text, 'xy z');
  });
});

describe('sitePath', () => {
  it('keeps a path, and reduces an absolute URL on this origin to its path', () => {
    const origin = 'https://openplate.de';
    assert.equal(sitePath({ url: '/en/docs/app/sync/', origin }), '/en/docs/app/sync/');
    assert.equal(sitePath({ url: 'https://openplate.de/docs/app/sync/#setup', origin }), '/docs/app/sync/#setup');
    // Control: another origin is not this site's page, and is not rewritten into one.
    assert.equal(sitePath({ url: 'https://example.test/x', origin }), 'https://example.test/x');
  });
});

describe('copyableText', () => {
  it('copies a plain fence exactly as written', () => {
    const code = 'services:\n  app:\n    image: x';
    assert.equal(copyableText({ code, lang: 'yaml' }), code);
  });

  it('copies only the commands of a transcript, without their prompts', () => {
    const code = '$ pnpm dev\n> ready on :3000\n$ curl localhost:3000';
    assert.equal(copyableText({ code, lang: 'console' }), 'pnpm dev\ncurl localhost:3000');
  });

  it('leaves a dollar sign that is not a prompt alone', () => {
    // Control: `$` outside a console transcript is a variable, not a prompt.
    const code = 'echo $HOME';
    assert.equal(copyableText({ code, lang: 'bash' }), code);
  });
});
