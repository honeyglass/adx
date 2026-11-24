import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { effect, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

// A command may name a field version, since --version belongs to the tool called alone.
const release = effect({
  does: 'records a release',
  input: z.object({ version: z.string() }),
  plan: ({ version }) => ({ version }),
});

const hello = tool({ name: 'hello', version: '0.1.0', does: 'x', commands: { release } });

test('the tool called with --version answers its version', async () => {
  const piped = await run(hello, ['--version']);
  assert.deepEqual([piped.exit, piped.out], [0, '{"ok":true,"result":"0.1.0"}\n']);
  const shown = await run(hello, ['--version'], { tty: true });
  assert.equal(shown.out, '0.1.0\n');
});

test('--version with a command is that command field, and anywhere else no option', async () => {
  const recorded = await run(hello, ['release', '--version', '2.0.0', '--dry-run']);
  assert.deepEqual(answerIn(recorded.out, z.unknown()).result, { version: '2.0.0' });
  const valued = await run(hello, ['--version=1']);
  assert.deepEqual(
    answerIn(valued.out, z.unknown()).issues?.map(i => i.code),
    ['OPTION_BEFORE_COMMAND'],
  );
});
