// proto/examples/refuse.ts as a program, with the answer of the guide's "Refusing bad input".
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { test } from 'node:test';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const REFUSE = join(PROTO, 'examples', 'refuse.ts');

const hello = (home: string, ...argv: string[]) => program(REFUSE, argv, { home });

test('refuses a formal greeting in a language without one', async t => {
  const home = await scratch(t);
  const argv = ['greet', '--name', 'Ada', '--lang', 'eo', '--style', 'formal'];
  const { exit, out } = await hello(home, ...argv);
  const answer = answerIn(out, z.unknown());
  const issue = answer.issues?.[0];
  assert.equal(exit, 1);
  assert.equal(answer.kind, 'fix');
  assert.deepEqual([issue?.code, issue?.path], ['NO_FORMAL_GREETING', 'style']);
  // the handler's own message, which adx carries unchanged
  assert.equal(issue?.message, 'Esperanto has no formal greeting');
});
