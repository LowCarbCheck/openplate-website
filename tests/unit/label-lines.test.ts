/**
 * `splitLabel`, which decides whether a drawing's label fits on one line or needs two.
 *
 * The cases are the real labels the front page's drawings carry in six languages, because those
 * are what the drawings' columns were measured against.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { splitLabel } from '../../app/components/illustrations/label-lines';

describe('splitLabel', () => {
  it('keeps a label that fits on one line', () => {
    assert.deepEqual(splitLabel({ text: 'Food database', maxLineLength: 20 }), ['Food database']);
  });

  it('keeps a label exactly at the limit on one line', () => {
    assert.deepEqual(splitLabel({ text: 'openplate app server', maxLineLength: 20 }), ['openplate app server']);
  });

  it('breaks a longer label at the space nearest its middle', () => {
    assert.deepEqual(splitLabel({ text: 'Base de données alimentaire', maxLineLength: 20 }), [
      'Base de données',
      'alimentaire',
    ]);
  });

  it('breaks at the earlier space when two are equally near the middle', () => {
    assert.deepEqual(splitLabel({ text: 'openplate uygulama sunucusu', maxLineLength: 20 }), [
      'openplate',
      'uygulama sunucusu',
    ]);
  });

  it('breaks an arrow name after its comma', () => {
    assert.deepEqual(splitLabel({ text: 'Tagebuch, verschlüsselt', maxLineLength: 18 }), [
      'Tagebuch,',
      'verschlüsselt',
    ]);
  });

  it('leaves a long label with no space on one line', () => {
    assert.deepEqual(splitLabel({ text: 'Lebensmitteldatenbank', maxLineLength: 20 }), ['Lebensmitteldatenbank']);
  });

  it('never returns more than two lines', () => {
    const lines = splitLabel({ text: 'one two three four five six seven eight', maxLineLength: 5 });
    assert.equal(lines.length, 2);
    assert.equal(lines.join(' '), 'one two three four five six seven eight');
  });
});
