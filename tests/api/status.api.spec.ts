import assert from 'node:assert/strict';
import { test } from 'node:test';
import { failed, status } from '@honeyglass/adx';

const answered = (code: number) =>
  new Error('the server answered', { cause: new Response(null, { status: code }) });

test('the status of a failed send is found along the causes', () => {
  assert.equal(status(answered(409)), 409);
  assert.equal(status(failed('Nothing was changed.', answered(409))), 409);
});

test('an error without an HTTP answer has no status', () => {
  const exited = Object.assign(new Error('Command failed: lint'), { status: 127, stderr: '' });
  assert.equal(status(exited), undefined);
  assert.equal(status(failed('Nothing was changed.', exited)), undefined);
  assert.equal(status(new Error('no answer')), undefined);
  assert.equal(status('409'), undefined);
  assert.equal(status(undefined), undefined);
});
