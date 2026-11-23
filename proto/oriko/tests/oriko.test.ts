import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { conformance, run } from '@honeyglass/adx/test';
import { oriko } from '../cli/oriko.ts';

const seed = 'tests/seed'; // holds the CV jane with its photo, and the profiles acme and broken
const cwd = 'tests/work'; // holds posting.txt, which the calls only read
const picture = join(import.meta.dirname, 'work', 'me.png'); // a picture may lie anywhere
const samples = { seed };

test('oriko keeps the agent rules', t => conformance(t, oriko, samples));

test('the program keeps them too', t => conformance(t, ['node', 'bin/oriko.ts'], samples));

test('a person at a terminal reads the plan as text', async () => {
  const { exit, out } = await run(oriko, ['plan'], { cwd, stdin: null, tty: true, seed });
  assert.equal(exit, 0);
  assert.match(out, /^pages/);
});

test('a block the profile names and the CV lacks stands below the profile', async () => {
  const { exit, out } = await run(oriko, ['plan', '--profile', 'broken'], samples);
  const [issue] = JSON.parse(out).issues;
  assert.equal(exit, 1);
  assert.equal(issue.code, 'UNKNOWN_BLOCK');
  assert.equal(issue.path, 'profile.blocks.nobody');
  // the hint of cli/hints.ts: core/ refuses, and the command lies in cv/
  assert.match(issue.command, /^oriko show/);
});

test('a profile comes through stdin, and a block it names must exist', async () => {
  const argv = ['profile', 'set', '--profile', 'initech', '--json', '-'];
  const stored = await run(oriko, argv, { ...samples, stdin: '{"cv":"jane"}' });
  assert.equal(JSON.parse(stored.out).result.file, 'profiles/initech.json');
  const stdin = '{"cv":"jane","blocks":{"nobody":{"hidden":true}}}';
  const refused = await run(oriko, argv, { ...samples, stdin });
  assert.equal(JSON.parse(refused.out).issues[0].path, 'blocks.nobody');
});

test('a build replaces its file without --replace', async () => {
  const work = await mkdtemp(join(tmpdir(), 'oriko-work-'));
  const argv = ['build', '--out', 'cv.docx'];
  const first = await run(oriko, argv, { ...samples, cwd: work });
  assert.equal(JSON.parse(first.out).result.replaces, false);
  const second = await run(oriko, argv, { ...samples, cwd: work });
  assert.equal(second.exit, 0);
  assert.equal(JSON.parse(second.out).result.replaces, true);
});

test('a new CV names the shared placeholder as its photo', async () => {
  const fields = '{"language":"de","firstName":"Erika","lastName":"Muster","role":"Entwicklerin"}';
  const { out } = await run(oriko, ['init', '--cv', 'erika', '--json', fields], samples);
  const { result } = JSON.parse(out);
  assert.equal(result.photo, 'placeholder.png');
  assert.equal(result.placeholder.file, 'placeholder.png');
});

test('a first photo is a new file, and a second one needs --replace', async () => {
  // the profile acme has no photo of its own yet
  const first = await run(oriko, ['photo', 'set', '--file', picture, '--profile', 'acme'], samples);
  assert.equal(JSON.parse(first.out).result.photo.replaces, false);
  // the CV jane has one, cvs/jane.png
  const argv = ['photo', 'set', '--file', picture, '--cv', 'jane'];
  const refused = await run(oriko, argv, samples);
  assert.equal(refused.exit, 1);
  assert.equal(JSON.parse(refused.out).issues[0].code, 'ALREADY_EXISTS');
  const replaced = await run(oriko, [...argv, '--replace'], samples);
  assert.equal(JSON.parse(replaced.out).result.photo.replaces, true);
});

test('the start answer names steps and holds no data of the folder', async () => {
  const { out } = await run(oriko, [], samples);
  const answer = JSON.parse(out);
  assert.equal(answer.result.cvs, undefined);
  assert.equal(answer.next[0].command.startsWith('oriko profiles'), true);
});
