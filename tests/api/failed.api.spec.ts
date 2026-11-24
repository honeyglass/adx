import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readRefusal, RefusalError } from '@honeyglass/utils/ts';
import { code, failed, Refused } from '@honeyglass/adx';

const STATE = 'The migration ran up to step 3.';

const answered = (status: number) =>
  new Error('the server answered', { cause: new Response(null, { status }) });

const systemError = (fields: Record<string, string | number>) =>
  Object.assign(new Error('a system call failed'), fields);

test('an error adx does not know fails as UNKNOWN_ERROR of kind bug, with the state', () => {
  const cause = new TypeError('undefined is not a function');
  const refused = failed(STATE, cause);
  assert.ok(refused instanceof Refused);
  assert.ok(refused instanceof RefusalError);
  assert.equal(refused.kind, 'bug');
  assert.deepEqual(
    refused.issues.map(i => i.code),
    ['UNKNOWN_ERROR'],
  );
  assert.equal(refused.cause, cause);
  assert.equal(readRefusal(refused.message)?.state, STATE);
});

test('an error nobody mapped gets the code and kind of its row', () => {
  const rows: [string, Error, string, string][] = [
    [
      'a full disk',
      systemError({ code: 'ENOSPC', syscall: 'write', path: '/d/a' }),
      'SYSTEM_REFUSED',
      'ask',
    ],
    [
      'no connection',
      new TypeError('fetch failed', {
        cause: systemError({ code: 'ECONNREFUSED', syscall: 'connect' }),
      }),
      'NETWORK_FAILED',
      'retry',
    ],
    [
      'a timeout',
      new DOMException('the call timed out', 'TimeoutError'),
      'NETWORK_FAILED',
      'retry',
    ],
    ['408', answered(408), 'SERVER_BUSY', 'retry'],
    ['429', answered(429), 'SERVER_BUSY', 'retry'],
    ['502', answered(502), 'SERVER_BUSY', 'retry'],
    ['503', answered(503), 'SERVER_BUSY', 'retry'],
    ['504', answered(504), 'SERVER_BUSY', 'retry'],
    ['401', answered(401), 'ACCESS_REFUSED', 'ask'],
    ['403', answered(403), 'ACCESS_REFUSED', 'ask'],
    ['404', answered(404), 'REMOTE_REFUSED', 'ask'],
    ['a program that exits 127', systemError({ status: 127, pid: 7 }), 'UNKNOWN_ERROR', 'bug'],
    [
      'a system error on no path',
      systemError({ code: 'EPERM', syscall: 'kill' }),
      'UNKNOWN_ERROR',
      'bug',
    ],
  ];
  for (const [cause, error, codeName, kind] of rows) {
    const refused = failed(STATE, error);
    assert.deepEqual(
      [cause, refused.issues.map(i => i.code), refused.kind],
      [cause, [codeName], kind],
    );
  }
});

test('a refusal as cause gives its kind, and blocked is ask as the answer says', () => {
  const refusal = (kind: 'retry' | 'blocked') =>
    new RefusalError({ kind, step: 'db migrate', reason: 'the database is locked', next: 'wait' });
  assert.equal(failed(STATE, refusal('retry')).kind, 'retry');
  assert.equal(failed(STATE, refusal('blocked')).kind, 'ask');
  assert.equal(readRefusal(failed(STATE, refusal('retry')).message)?.state, STATE);
});

test('a refusal of adx as cause keeps its kind and codes, with the new state', () => {
  const locked = code('DATABASE_LOCKED', 'retry', 'Call again in a minute');
  const first = new Refused(
    { kind: 'retry', step: 'db migrate', reason: 'the database is locked', next: 'wait' },
    [locked.issue()],
  );
  const refused = failed(STATE, first);
  assert.equal(refused.kind, 'retry');
  assert.deepEqual(
    refused.issues.map(i => i.code),
    ['DATABASE_LOCKED'],
  );
  assert.equal(refused.cause, first);
  assert.equal(readRefusal(refused.message)?.state, STATE);
});

test('a state of two lines is a bug of the caller', () => {
  const made = () => failed('Step 1 ran.\nStep 2 did not.', new Error('x'));
  assert.throws(made, (error: unknown) => error instanceof RefusalError && error.kind === 'bug');
});
