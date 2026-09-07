/**
 * The order of the steps in `.github/workflows/sync-docs.yml`.
 *
 * ── WHY AN ORDERING DESERVES A TEST ──
 * `sync:docs` draws the diagrams and `translate:docs` buys the words they are drawn with. The
 * workflow ran them in that order and nothing after, so a label first translated by a run was
 * drawn by that run in English and stayed English until some later run happened to redraw it.
 * Commit `032d409` shipped exactly that: four drawings of one diagram, German and French, light
 * and dark, reading "Configured food data" under a paragraph that translates the phrase.
 *
 * The fix is a second `sync:docs` after the translation, and the fix is one line of YAML with
 * nothing holding it in place. Someone tidying the file into "sync, sync, translate" would be
 * making it read better and would be shipping English labels again, and no other tier in this
 * repository would notice: the sync is idempotent, the tests pass, the build passes, and the
 * damage only appears in a committed SVG on a page nobody looked at in German. So the ordering
 * is asserted here, where breaking it is red.
 *
 * ── IT KEYS ON WHAT THE STEPS RUN, NOT ON WHAT THEY ARE CALLED ──
 * A step is "a drawing step" here because its shell runs `pnpm run sync:docs`, and "the
 * translation step" because its shell runs `pnpm run translate:docs`. Names are prose and prose gets rewritten; the
 * command is the thing that has the effect. Renaming a step must not quietly disarm this file.
 *
 * ── AND IT READS THE STEPS AS A SEQUENCE, NOT AS TEXT ──
 * `stepsOf` walks the `steps:` block by indentation and returns one entry per list item. A grep
 * for two strings in a file would pass on a workflow whose steps were in a different job, or
 * commented out, or written twice in one step's shell. There is no YAML parser among this
 * repository's dependencies and this file is not the reason to add one, so the walk below reads
 * the one shape it needs and refuses loudly on anything else.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

const WORKFLOW = resolve(import.meta.dirname, '../../.github/workflows/sync-docs.yml');

/** One item of the workflow's `steps:` list. `run` is empty for a step that only says `uses:`. */
type Step = {
  readonly name: string;
  readonly run: string;
};

/** The lines of a block scalar introduced by `key: |`, dedented, stopping where the block does. */
function blockScalar(lines: readonly string[], from: number, indent: number): string {
  const body: string[] = [];
  for (const line of lines.slice(from)) {
    if (line.trim() !== '' && !line.startsWith(' '.repeat(indent))) break;
    body.push(line.slice(indent));
  }
  return body.join('\n');
}

/** The `name:` and the shell of one step, given the item's lines with the `- ` already stripped. */
function stepOf(lines: readonly string[], indent: number): Step {
  let name = '';
  let run = '';
  for (const [at, line] of lines.entries()) {
    // Keys of the step itself only. A deeper line belongs to `env:` or to a shell, and a shell
    // that happens to contain `run:` must not be mistaken for the step's own.
    if (!line.startsWith(`${' '.repeat(indent)}name:`) && !line.startsWith(`${' '.repeat(indent)}run:`)) continue;
    const [key, ...rest] = line.trim().split(':');
    const value = rest.join(':').trim();
    if (key === 'name') name = value.replace(/^['"]|['"]$/gu, '');
    else run = value === '|' ? blockScalar(lines, at + 1, indent + 2) : value;
  }
  return { name, run };
}

/** Every step of the workflow's one job, in the order the runner executes them. */
function stepsOf(): readonly Step[] {
  const lines = readFileSync(WORKFLOW, 'utf8').split('\n');
  const starts = lines.flatMap((line, at) => (/^\s+steps:\s*$/u.test(line) ? [at] : []));
  assert.equal(starts.length, 1, 'the workflow no longer has exactly one `steps:` block');
  const start = starts[0] ?? 0;

  const items: number[] = [];
  let indent = 0;
  for (const [at, line] of lines.entries()) {
    if (at <= start) continue;
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const depth = line.length - line.trimStart().length;
    if (items.length === 0) indent = depth;
    // The first line that is shallower than the list items ends the list.
    if (depth < indent) break;
    if (depth === indent) {
      assert.ok(line.trimStart().startsWith('- '), `${line.trim()} sits at the step indent and is not a list item`);
      items.push(at);
    }
  }
  assert.ok(items.length > 0, 'the workflow has no steps');

  return items.map((from, which) => {
    const to = items[which + 1] ?? lines.length;
    // `- name: x` becomes `  name: x`, so every key of the item is at one indent.
    const body = lines.slice(from, to).map((line, at) => (at === 0 ? line.replace('- ', '  ') : line));
    return stepOf(body, indent + 2);
  });
}

/**
 * The positions of the steps that draw, and of the steps that buy words.
 *
 * The whole invocation, not the script name on its own. The last step of the workflow ECHOES the
 * words `translate:docs refused the spend`, and a looser match counted that as a second
 * translation and failed this file on its own message.
 */
function draws(steps: readonly Step[]): readonly number[] {
  return steps.flatMap((step, at) => (step.run.includes('pnpm run sync:docs') ? [at] : []));
}

function translates(steps: readonly Step[]): readonly number[] {
  return steps.flatMap((step, at) => (step.run.includes('pnpm run translate:docs') ? [at] : []));
}

describe('the sync-docs workflow', () => {
  it('draws again after it translates, so a label bought by a run is drawn by that run', () => {
    const steps = stepsOf();
    const drawing = draws(steps);
    const translation = translates(steps);
    assert.equal(translation.length, 1, 'expected exactly one step running translate:docs');
    const buys = translation[0] ?? -1;
    const after = drawing.filter((at) => at > buys);
    assert.ok(
      after.length > 0,
      `nothing runs sync:docs after "${steps[buys]?.name}". A label this run buys will ship in English.`,
    );
  });

  it('still draws before it translates, because the translator reads what the sync writes', () => {
    const steps = stepsOf();
    const buys = translates(steps)[0] ?? -1;
    const before = draws(steps).filter((at) => at < buys);
    assert.ok(before.length > 0, 'nothing runs sync:docs before the translation, so there is no parsed tree to buy');
  });

  it('reads the steps as a list, and finds the ones this repository expects', () => {
    // A cheap check on the walk itself. Every assertion above is about what is NOT there, and a
    // parser that silently returned nothing would satisfy none of them and fail all of them for
    // the wrong reason. This one fails first and says so.
    const steps = stepsOf();
    assert.ok(steps.length >= 8, `only ${steps.length} steps were read out of the workflow`);
    assert.ok(
      steps.some((step) => step.name === 'Commit'),
      'no step named Commit, so the walk is reading the wrong lines',
    );
  });
});
