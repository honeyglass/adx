import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checksOf } from '../../src/test/checks.ts';
import { ruleLines } from '../../src/test/rules.ts';
import type { Outcome } from '../../src/test/rules.ts';

const IDLE = fileURLToPath(new URL('../fixtures/idle.program.ts', import.meta.url));

test('a check that finds nothing to call leaves its rule not probed, with the reason', async t => {
  const outcomes = new Map<string, Outcome>();
  for (const check of await checksOf(t, ['node', IDLE], {}))
    outcomes.set(check.name, await check.outcome());
  assert.deepEqual(
    ruleLines(outcomes).map(({ rule, status, reason }) => [rule, status, reason]),
    [
      ['Raw JSON input', 'met', undefined],
      ['Schema at run time', 'met', undefined],
      ['JSON when piped', 'met', undefined],
      ['Input hardening', 'not probed', 'no text field to probe'],
      ['Dry runs', 'not probed', 'no effect to dry-run'],
      ['Agent skill', 'not probed', 'only conformance with the tool reads the skill'],
      ['Checks in layers', 'not probed', 'no probe tells which layer refused a call'],
      ['Errors with a hint', 'not probed', 'no probe judges whether a hint says what to change'],
      ['All or nothing', 'not probed', 'no probe makes a write fail halfway'],
      ['Exit codes 0, 1, 2', 'met', undefined],
      ['Plan before the file', 'not probed', 'no probe compares a plan with the file it writes'],
      ['Hints that run', 'met', undefined],
      ['Options that list', 'not probed', 'no option that lists values'],
      ['Next steps', 'met', undefined],
      ['Nothing passes silently', 'met', undefined],
      ['Context discipline', 'not probed', 'no read without an output schema'],
    ],
  );
});
