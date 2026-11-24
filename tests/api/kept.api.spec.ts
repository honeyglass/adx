// The skill check of conformance needs the file of a skill by its name (skillFile() answers
// undefined), and the stored data check the folder of the tool's package.json (packageFolder()
// answers undefined); adx cannot find either yet. Until it can, this test opens the two checks in
// dist/ and hands them a folder of its own.
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { z } from 'zod';
import { stored } from '@honeyglass/adx';
import { skillFindings, storedFindings } from '../../dist/test/kept.js';

async function folder(t: TestContext) {
  const made = await mkdtemp(join(tmpdir(), 'adx-kept-'));
  t.after(() => rm(made, { recursive: true, force: true }));
  return made;
}

test('a skill starts with a frontmatter whose name and description hold a value', async t => {
  const at = await folder(t);
  const file = join(at, 'SKILL.md');
  assert.deepEqual(skillFindings('hello', file), [`the skill hello has no file ${file}`]);
  await writeFile(file, '---\nname:\ndescription: greets people\n---\n# Hello\n');
  assert.deepEqual(skillFindings('hello', file), [
    `${file} is no skill: it starts with no frontmatter with name and description`,
  ]);
  await writeFile(file, '---\nname: hello\ndescription: greets people\n---\n');
  assert.deepEqual(skillFindings('hello', file), []);
});

test('a stored schema must keep the fingerprint of its number; a description is no field', async t => {
  const at = await folder(t);
  const V1 = z.object({ name: z.string() });
  assert.deepEqual(storedFindings(at, [stored('friend', 1, V1)]), []);
  const written = JSON.parse(await readFile(join(at, 'adx.stored.json'), 'utf8'));
  assert.deepEqual(Object.keys(written.friend), ['1']);
  const described = z.object({ name: z.string().describe('the short name') });
  assert.deepEqual(storedFindings(at, [stored('friend', 1, described)]), []);
  const V2 = z.object({ name: z.string(), lang: z.string() });
  assert.deepEqual(storedFindings(at, [stored('friend', 1, V2)]), [
    'friend: the schema changed, but its version is still 1.\nRaise it to 2 and add .from(1, ...) for the old files.',
  ]);
  const raised = stored('friend', 2, V2).from(1, V1, old => ({ ...old, lang: 'en' }));
  assert.deepEqual(storedFindings(at, [raised]), []);
});
