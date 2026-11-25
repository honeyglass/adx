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

test('a read without output that answers a long list or a large document is a DECLARATION bug at that call', async () => {
  const sized = read({
    does: 'answers as much as asked',
    input: z.object({ items: z.number(), bytes: z.number() }),
    example: { items: 1, bytes: 1 },
    run: ({ items, bytes }) => ({
      items: Array.from({ length: items }, (_, i) => i),
      text: 'x'.repeat(bytes),
    }),
  });
  const typed = read({
    does: 'answers a long list it declares',
    output: z.object({ items: z.array(z.number()) }),
    run: () => ({ items: Array.from({ length: 60 }, (_, i) => i) }),
  });
  // invoke runs a command of the tool that lists it
  tool({ name: 'sized', version: '0.1.0', does: 'x', commands: { sized, typed } });
  const ask = async (items: number, bytes: number) => {
    const invoked = await sized.invoke({ items, bytes });
    return [invoked.ok, invoked.kind, invoked.issues?.map(i => i.code)];
  };
  // fifty items and 8192 bytes are no long list and no large document yet (decision 56)
  assert.deepEqual(await ask(50, 7_000), [true, undefined, undefined]);
  assert.deepEqual(await ask(51, 1), [false, 'bug', ['DECLARATION']]);
  assert.deepEqual(await ask(1, 9_000), [false, 'bug', ['DECLARATION']]);
  assert.equal((await typed.invoke({})).ok, true);
});
