// proto/examples/check.ts as a program, with the answers of the guide's "Input that has parts".
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const CHECK = join(PROTO, 'examples', 'check.ts');

const hello = (home: string, ...argv: string[]) => program(CHECK, argv, { home });

test('names the shape to write, and refuses a part that fails it', async t => {
  const home = await scratch(t);
  const added = await hello(home, 'friends', 'add', '--name', 'ada', '--kind', 'colleague');
  assert.deepEqual(
    answerIn(added.out, z.unknown()).next?.map(step => step.command),
    ['hello schema colleague', 'hello friends describe --name ada'],
  );
  const about = '{"about":{"team":7}}';
  const refused = await hello(home, 'friends', 'describe', '--name', 'ada', '--json', about);
  const issue = answerIn(refused.out, z.unknown()).issues?.[0];
  assert.equal(refused.exit, 1);
  assert.deepEqual(
    [issue?.code, issue?.path, issue?.command],
    ['SCHEMA', 'about.team', 'hello schema colleague'],
  );
});
