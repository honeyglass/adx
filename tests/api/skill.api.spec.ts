// conformance shows only that the check "agent skill" failed; this test opens the check in dist/
// to read why, and what to do next, for the file a test names in samples.skillFile.
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { skillFailure } from '../../dist/test/skill.js';

const SKILLS = fileURLToPath(new URL('../fixtures/skill', import.meta.url));
const VALID = join(SKILLS, 'SKILL.md');
const FIX_FILE =
  'name in samples.skillFile a SKILL.md that starts with a frontmatter with name and description';

test('a SKILL.md with a frontmatter of name and description is a skill, by any path', () => {
  assert.equal(skillFailure('hello', VALID), undefined);
  assert.equal(skillFailure('hello', relative(process.cwd(), VALID)), undefined);
});

test('a file with no frontmatter, or no file, fails with a next that names the file', () => {
  const bare = skillFailure('hello', join(SKILLS, 'bare.md'));
  assert.deepEqual(
    [bare?.findings, bare?.next],
    [['the SKILL.md of hello starts with no frontmatter with name and description'], FIX_FILE],
  );
  const none = join(SKILLS, 'none.md');
  assert.deepEqual(skillFailure('hello', none)?.findings, [`samples.skillFile ${none} is no file`]);
  assert.deepEqual(skillFailure('hello', SKILLS)?.findings, [
    `samples.skillFile ${SKILLS} is no file`,
  ]);
});

test('a tool with a skill and no skillFile in its samples fails', () => {
  assert.equal(
    skillFailure('hello', undefined)?.next,
    "name the repository's SKILL.md in samples.skillFile, relative to the test's working folder",
  );
});

test('an unreadable file is a finding, and the scratch home is gone after the check', t => {
  const scratchRoot = mkdtempSync(join(tmpdir(), 'adx-skill-'));
  const before = process.env.TMPDIR;
  t.after(() => {
    process.env.TMPDIR = before;
    rmSync(scratchRoot, { recursive: true, force: true });
  });
  const file = join(scratchRoot, 'SKILL.md');
  writeFileSync(file, '---\nname: hello\ndescription: greets\n---\n');
  chmodSync(file, 0o000);
  const homes = join(scratchRoot, 'homes');
  process.env.TMPDIR = mkdtempSync(homes);
  const failure = skillFailure('hello', file);
  assert.match(failure?.findings[0] ?? '', /cannot be read: .*EACCES/);
  assert.equal(failure?.next, FIX_FILE);
  assert.deepEqual(readdirSync(process.env.TMPDIR), []);
});

test('a name that is no skill name builds no path, points at the name, and the real home stays', () => {
  const home = process.env.HOME;
  const misnamed = skillFailure('../x', VALID);
  assert.deepEqual(misnamed?.findings, [
    'the skill "../x" has no name of lowercase letters, digits and -',
  ]);
  assert.equal(
    misnamed?.next,
    'rename the skill in tool(): lowercase letters, digits and -, at most 64 characters',
  );
  assert.equal(skillFailure('adx-kit-probe', VALID), undefined);
  assert.equal(process.env.HOME, home);
  assert.equal(existsSync(join(homedir(), '.claude', 'skills', 'adx-kit-probe')), false);
});
