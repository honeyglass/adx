// proto/oriko as the program bin/oriko.ts, with the answers of its README and its tests.
//
// Most commands of proto/oriko call functions it only declares, so they cannot run. These
// journeys stop before a handler: the start answer, the schema, and a refusal of adx.
import assert from 'node:assert/strict';
import { cp } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { PROTO, program, scratch } from '../utils/program.ts';

const ORIKO = join(PROTO, 'oriko', 'bin', 'oriko.ts');

// A home whose data folder ~/.oriko holds the CV jane and the profiles acme and broken.
async function seeded(t: TestContext) {
  const home = await scratch(t);
  await cp(join(PROTO, 'oriko', 'tests', 'seed'), join(home, '.oriko'), { recursive: true });
  return home;
}

const oriko = (home: string, ...argv: string[]) => program(ORIKO, argv, { home });

test(
  'the start answer names steps and holds no data of the folder',
  { todo: 'green with P10' },
  async t => {
    const home = await seeded(t);
    const { exit, out } = await oriko(home);
    const answer = JSON.parse(out);
    assert.equal(exit, 0);
    assert.deepEqual(
      [answer.result.home, answer.result.cvs, answer.result.profiles],
      [undefined, undefined, undefined],
    );
    assert.deepEqual(
      answer.next.map((step: { command: string }) => step.command),
      ['oriko profiles', 'oriko read'],
    );
  },
);

test('the schema lists the five shapes', { todo: 'green with P10' }, async t => {
  const home = await seeded(t);
  const { exit, out } = await oriko(home, 'schema');
  assert.equal(exit, 0);
  assert.deepEqual(JSON.parse(out).result.shapes.toSorted(), [
    'block',
    'contact',
    'item',
    'master',
    'profile',
  ]);
});

test(
  'a CV that is not stored is refused before the handler runs',
  { todo: 'green with P10' },
  async t => {
    const home = await seeded(t);
    const { exit, out } = await oriko(home, 'show', '--cv', 'nobody');
    const [issue] = JSON.parse(out).issues;
    assert.equal(exit, 1);
    assert.deepEqual([issue.code, issue.path], ['NOT_IN_LIST', 'cv']);
  },
);
