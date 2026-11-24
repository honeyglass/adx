import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { RefusalError } from '@honeyglass/utils/ts';
import { failed, read, tool } from '@honeyglass/adx';

const greet = read({
  does: 'greets one person',
  input: z.object({ name: z.string() }),
  example: { name: 'Ada' },
  run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
});

const busy = read({
  does: 'waits for a busy server',
  input: z.object({}),
  example: {},
  run: () => {
    const refusal = { kind: 'retry', step: 'greet', reason: 'busy', next: 'wait' } as const;
    throw failed('Nothing was changed.', new RefusalError(refusal));
  },
});

const crash = read({
  does: 'breaks',
  input: z.object({}),
  example: {},
  run: () => {
    throw new TypeError('boom');
  },
});

tool({ name: 'hello', version: '0.1.0', does: 'greets', commands: { greet, busy, crash } });

test('invoke answers the object the tool prints', async () => {
  assert.deepEqual(await greet.invoke({ name: 'Ada' }), {
    ok: true,
    result: { greeting: 'Hello, Ada!' },
  });
});

test('invoke answers a refusal and a bug, and never rejects', async () => {
  const refused = await busy.invoke({});
  assert.deepEqual(
    [refused.ok, refused.kind, refused.issues?.[0]?.code],
    [false, 'retry', 'UNKNOWN_ERROR'],
  );
  const broke = await crash.invoke({});
  assert.deepEqual(
    [broke.ok, broke.kind, broke.issues?.[0]?.code],
    [false, 'bug', 'UNKNOWN_ERROR'],
  );
});
