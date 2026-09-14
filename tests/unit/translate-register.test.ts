/**
 * The one thing that must be true of the bundle split: a `legal` request is
 * formal, every other request is informal, and the two cannot be swapped by
 * an argument nobody threaded through.
 *
 * ── THE FETCH IS NEVER REACHED ──
 * `register` and `style` build the system prompt; they never call the model.
 * Nothing here spends money, and nothing here can, because `translate` is not
 * imported.
 *
 * ── EVERY ASSERTION HAS A CONTROL ──
 * The house rule: an assertion that cannot fail is worse than no assertion.
 * Each positive claim below ("legal is formal") sits beside the negative that
 * would catch the one regression this feature exists to prevent: `bundle`
 * quietly ignored, so `'legal'` and everything else read the same request.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { register, style } from '../../scripts/lib/translate';
import { bundleForNamespace } from '../../scripts/lib/translate-ui';

describe('register: legal is formal, everything else is informal', () => {
  it('addresses German as "du" for a common bundle, never "Sie"', () => {
    const text = register('de', 'common');
    assert.equal(/\bdu\b/.test(text), true);
    assert.equal(/\bSie\b/.test(text), false);
  });

  it('addresses German as "Sie" for the legal bundle', () => {
    const text = register('de', 'legal');
    assert.equal(/\bSie\b/.test(text), true);
  });

  it('CONTROL: the legal and common instructions are not the same string', () => {
    // If `register` ignored its `bundle` argument -- the exact regression
    // this feature exists to prevent -- the two calls below would return the
    // same text, and this assertion is the one that would catch it.
    assert.notEqual(register('de', 'legal'), register('de', 'common'));
  });

  it('addresses French as "tu" for a common bundle, "vous" for the legal one', () => {
    assert.equal(/\btu\b/.test(register('fr', 'common')), true);
    assert.equal(/\bvous\b/.test(register('fr', 'common')), false);
    assert.equal(/\bvous\b/.test(register('fr', 'legal')), true);
    assert.notEqual(register('fr', 'legal'), register('fr', 'common'));
  });

  it('writes the formal register for Spanish and Turkish, unshipped languages the table stays complete for', () => {
    assert.equal(/\busted\b/.test(register('es', 'legal')), true);
    assert.equal(/\bsiz\b/.test(register('tr', 'legal')), true);
    // Neither has a locale-specific informal branch; both fall to the generic
    // line, and the generic formal and informal lines must still differ.
    assert.notEqual(register('es', 'legal'), register('es', 'common'));
    assert.notEqual(register('tr', 'legal'), register('tr', 'common'));
  });

  it('treats any bundle name that is not "legal" as informal, not just "common"', () => {
    // `translate-docs.ts` names its own bundle `'docs'`, never `'common'`. The
    // rule is `bundle === 'legal'`, not `bundle !== 'common'`, and a locale
    // whose informal text is bundle-name-independent proves it: the docs
    // pipeline's request is byte-identical to the UI pipeline's.
    assert.equal(register('de', 'docs'), register('de', 'common'));
    assert.equal(register('de', 'anything-else'), register('de', 'common'));
  });
});

describe('style: forwards its bundle into register, never a hardcoded one', () => {
  it('embeds the formal register line for the legal bundle', () => {
    assert.equal(style('de', 'legal').includes(register('de', 'legal')), true);
  });

  it('embeds the informal register line for the common bundle', () => {
    assert.equal(style('de', 'common').includes(register('de', 'common')), true);
  });

  it('CONTROL: the two full prompts are not the same string', () => {
    // The same regression as `register`'s control, one layer up: if `style`
    // called `register(locale, 'common')` regardless of its own `bundle`
    // argument, this would incorrectly pass.
    assert.notEqual(style('de', 'legal'), style('de', 'common'));
  });

  it('is byte-identical for an informal bundle to what this site has always sent', () => {
    // `translate-docs.ts` asks for the `'docs'` bundle, `translate-ui.ts` asks
    // for `'common'`. Neither is `'legal'`, so the request either pipeline
    // sends today is unchanged by this feature.
    assert.equal(style('de', 'docs'), style('de', 'common'));
  });
});

describe('bundleForNamespace: the classification the app repo\'s copy reuses', () => {
  it('classifies a legal namespace into the legal bundle', () => {
    assert.equal(bundleForNamespace('legal'), 'legal');
  });

  it('classifies every other namespace into the common bundle, not its own name', () => {
    // CONTROL for the rule being "everything but legal", not "everything
    // named common": a namespace named after itself would pass a looser check
    // that only ever tested `'common'`.
    assert.equal(bundleForNamespace('common'), 'common');
    assert.equal(bundleForNamespace('docs'), 'common');
  });
});
