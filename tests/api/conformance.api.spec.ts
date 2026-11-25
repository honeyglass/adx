import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';

const FIXTURE = fileURLToPath(new URL('../fixtures/conformance.fixture.ts', import.meta.url));

/** Two minutes, far beyond the run of the fixture, so only a hang reaches it. */
const FIXTURE_MS = 120_000;

/** One line of TAP that ends a test: its indent, whether it passed, and its name. */
const RESULT = /^( *)(ok|not ok) \d+ - (.+?)(?: # .*)?$/;

/**
 * The fixture runs in a test runner of its own, since node:test runs no files from inside a test.
 *
 * @returns each test of the fixture, by its name, with the names of the probes that failed in
 * it; a test that failed before any probe ran names itself
 */
function failedProbes(t: TestContext) {
  const cwd = mkdtempSync(join(tmpdir(), 'adx-conformance-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const env = { ...process.env, NODE_TEST_CONTEXT: undefined };
  const ran = spawnSync(process.execPath, ['--test', '--test-reporter=tap', FIXTURE], {
    cwd,
    env,
    encoding: 'utf8',
    timeout: FIXTURE_MS,
    killSignal: 'SIGKILL',
  });
  assert.equal(ran.signal, null, 'the fixture did not end: a server of a fake stays open');
  const failed: Record<string, string[]> = {};
  let probes: string[] = [];
  for (const line of ran.stdout.split('\n')) {
    const [, indent = '', result, name = ''] = RESULT.exec(line) ?? [];
    if (result === undefined) continue;
    if (indent.length > 0 && result === 'not ok') probes.push(name);
    if (indent.length > 0) continue;
    failed[name] = [...probes, ...(result === 'not ok' && probes.length === 0 ? [name] : [])];
    probes = [];
  }
  return failed;
}

test('conformance passes a tool that keeps the rules, and fails each broken rule alone', t => {
  assert.deepEqual(failedProbes(t), {
    hello: [],
    'hello as a program': [],
    quoting: [],
    noisy: ['JSON when piped'],
    unlisted: ['hints that run'],
    unbounded: ['large answers'],
    unwritten: ['--replace'],
    broken: ['raw JSON input', 'exit codes'],
    leaky: ['dry runs'],
    'leaky as a program': ['dry runs'],
    'sending as a program': ['dry runs'],
    loose: ['nothing passes silently'],
    listless: ['options that list'],
    commandless: ['values outside a list'],
    templated: ['input hardening'],
    unstarted: ['start answer'],
    unprintable: ['schema at run time', 'exit codes'],
    unexampled: ['raw JSON input'],
    misgiven: ['hints that run'],
    unquoted: ['hints that run'],
    skilled: [],
    'skilled without a skill file': ['agent skill'],
    'skilled with a bare file': ['agent skill'],
    'skilled with no file': ['agent skill'],
    // a fake no program can reach is refused before a server starts, and none stays open
    'fixed as a program': ['fixed as a program'],
  });
});
