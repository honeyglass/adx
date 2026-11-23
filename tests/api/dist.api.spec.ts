import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const TSC = fileURLToPath(import.meta.resolve('typescript/bin/tsc'));

// Every file below a folder, by its path from the folder, with its text.
async function filesOf(folder: string) {
  const entries = await readdir(folder, { recursive: true, withFileTypes: true });
  const files = entries.filter(entry => entry.isFile()).map(e => join(e.parentPath, e.name));
  const texts = await Promise.all(files.map(file => readFile(file, 'utf8')));
  return Object.fromEntries(files.map((file, i) => [relative(folder, file), texts[i]]));
}

test('dist/ holds the build of src/, which a tool installs from GitHub', async t => {
  const out = await mkdtemp(join(tmpdir(), 'adx-dist-'));
  t.after(() => rm(out, { recursive: true, force: true }));
  const build = spawnSync(process.execPath, [TSC, '-p', join(ROOT, 'src'), '--outDir', out]);
  assert.equal(build.status, 0, `tsc -p src failed:\n${build.stdout}`);
  const message = 'dist/ is not the build of src/: run pnpm run build';
  assert.deepEqual(await filesOf(join(ROOT, 'dist')), await filesOf(out), message);
});
