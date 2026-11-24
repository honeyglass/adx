import assert from 'node:assert/strict';
import { test } from 'node:test';
import { code, Issue } from '@honeyglass/adx';

const noFormal = code('NO_FORMAL_GREETING', 'fix', 'Greet casually');

test('an issue at a field names the code and the field', () => {
  const issue = noFormal.at('style', 'Esperanto has no formal greeting');
  assert.ok(issue instanceof Issue);
  assert.equal(issue.code, 'NO_FORMAL_GREETING');
  assert.deepEqual(issue.path, ['style']);
});

test('an issue below a field keeps the whole path', () => {
  assert.deepEqual(noFormal.at(['people', 1, 'lang']).path, ['people', 1, 'lang']);
});

test('an issue that concerns no field has no path', () => {
  const issue = noFormal.issue('the server is in maintenance');
  assert.equal(issue.code, 'NO_FORMAL_GREETING');
  assert.equal('path' in issue, false);
});

test('a command added to an issue keeps its code and path', () => {
  const issue = noFormal.at('style').command({ does: 'greets casually', command: 'hello greet' });
  assert.equal(issue.code, 'NO_FORMAL_GREETING');
  assert.deepEqual(issue.path, ['style']);
});
