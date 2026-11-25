import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ruleLines } from '../../src/test/rules.ts';
import type { Outcome } from '../../src/test/rules.ts';

const met: Outcome = {};

// Every check of conformance met its rule, the tool names no skill and keeps no stored data.
const allMet = new Map<string, Outcome>([
  ['start answer', met],
  ['schema at run time', met],
  ['raw JSON input', met],
  ['dry runs', met],
  ['nothing passes silently', met],
  ['options that list', met],
  ['values outside a list', met],
  ['input hardening', met],
  ['--replace', met],
  ['JSON when piped', met],
  ['exit codes', met],
  ['hints that run', met],
  ['large answers', met],
  ['agent skill', { subject: false }],
  ['stored data', { subject: false }],
]);

test('one line per Agent DX rule, in the order of the README; four rules no probe covers', () => {
  assert.deepEqual(ruleLines(allMet), [
    { rule: 'Raw JSON input', status: 'met' },
    { rule: 'Schema at run time', status: 'met' },
    { rule: 'JSON when piped', status: 'met' },
    { rule: 'Input hardening', status: 'met' },
    { rule: 'Dry runs', status: 'met' },
    { rule: 'Agent skill', status: 'none named' },
    {
      rule: 'Checks in layers',
      status: 'not probed',
      reason: 'no probe tells which layer refused a call',
    },
    {
      rule: 'Errors with a hint',
      status: 'not probed',
      reason: 'no probe judges whether a hint says what to change',
    },
    { rule: 'All or nothing', status: 'not probed', reason: 'no probe makes a write fail halfway' },
    { rule: 'Exit codes 0, 1, 2', status: 'met' },
    {
      rule: 'Plan before the file',
      status: 'not probed',
      reason: 'no probe compares a plan with the file it writes',
    },
    { rule: 'Hints that run', status: 'met' },
    { rule: 'Options that list', status: 'met' },
    { rule: 'Next steps', status: 'met' },
    { rule: 'Nothing passes silently', status: 'met' },
    { rule: 'Context discipline', status: 'met' },
  ]);
});

test('a rule fails with any probe that covers it, a todo is not probed, a skill that passes is named', () => {
  const failed = { reason: '1 of the probed calls broke --replace', next: 'x', findings: ['y'] };
  const outcomes = new Map([
    ...allMet,
    ['--replace', { failed }],
    ['values outside a list', { todo: 'not probed without an example: tracker ticket show' }],
    ['agent skill', { subject: true }],
  ]);
  const lines = ruleLines(outcomes);
  assert.deepEqual(
    lines.filter(line => ['Dry runs', 'Agent skill', 'Hints that run'].includes(line.rule)),
    [
      { rule: 'Dry runs', status: 'failed', reason: '1 of the probed calls broke --replace' },
      { rule: 'Agent skill', status: 'named' },
      {
        rule: 'Hints that run',
        status: 'not probed',
        reason: 'not probed without an example: tracker ticket show',
      },
    ],
  );
  const skillTodo = new Map([
    ...allMet,
    ['agent skill', { subject: true, todo: 'only in process' }],
  ]);
  assert.deepEqual(
    ruleLines(skillTodo).find(line => line.rule === 'Agent skill'),
    { rule: 'Agent skill', status: 'not probed', reason: 'only in process' },
  );
});

test('a rule is not probed when every check of it found nothing to call, else it is met', () => {
  const idle = new Map([
    ...allMet,
    ['dry runs', { idle: 'no effect to dry-run' }],
    ['--replace', { idle: 'no effect that takes --replace' }],
    ['values outside a list', { idle: 'no field with a list' }],
  ]);
  assert.deepEqual(
    ruleLines(idle).filter(line => ['Dry runs', 'Hints that run'].includes(line.rule)),
    [
      { rule: 'Dry runs', status: 'not probed', reason: 'no effect to dry-run' },
      { rule: 'Hints that run', status: 'met' },
    ],
  );
});

test('a check that did not run leaves its rule not probed', () => {
  const outcomes = new Map(allMet);
  outcomes.delete('large answers');
  assert.deepEqual(
    ruleLines(outcomes).find(line => line.rule === 'Context discipline'),
    { rule: 'Context discipline', status: 'not probed', reason: 'large answers did not run' },
  );
});
