// The program adxcheck, as package.json names it under bin, against proto/tracker and the
// fixture programs, with the answers of the guide's "Testing your tool".
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { text } from 'node:stream/consumers';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { listen } from '../utils/server.ts';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));

const Package = z.object({ bin: z.object({ adxcheck: z.string() }) });
const BIN = join(
  ROOT,
  Package.parse(JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))).bin.adxcheck,
);

/** A minute, far beyond the 15 s the probes of the tracker take, so only a hang reaches it. */
const TIMEOUT_MS = 60_000;

const TRACKER = ['node', 'proto/tracker/bin/tracker.ts'];

/** A fresh folder that the test removes when it ends. */
function folder(t: TestContext, name: string) {
  const made = mkdtempSync(join(tmpdir(), `adx-e2e-${name}-`));
  t.after(() => rmSync(made, { recursive: true, force: true }));
  return made;
}

/**
 * adxcheck from the folder of the repository, as the guide runs it from the tool's own. Its home
 * holds a skill of the name the fixtures give, so a check that read the home would find it.
 */
function started(t: TestContext, args: readonly string[], tmp = folder(t, 'tmp')) {
  const home = folder(t, 'home');
  mkdirSync(join(home, '.claude', 'skills', 'hello'), { recursive: true });
  cpSync(join(ROOT, 'tests/fixtures/skill/SKILL.md'), join(home, '.claude/skills/hello/SKILL.md'));
  const env = { PATH: process.env.PATH, HOME: home, TMPDIR: tmp };
  const options = { cwd: ROOT, env, timeout: TIMEOUT_MS, killSignal: 'SIGKILL' as const };
  const child = spawn(process.execPath, [BIN, ...args], options);
  child.stdin.end();
  const ended = Promise.all([text(child.stdout), text(child.stderr), once(child, 'close')]);
  return { child, home, tmp, ended };
}

async function adxcheck(t: TestContext, ...args: string[]) {
  const { home, ended } = started(t, args);
  const before = listing(home);
  const [out, err, [exit, signal]] = await ended;
  assert.equal(signal, null, `adxcheck ${args.join(' ')} ran past ${TIMEOUT_MS} ms`);
  // adxcheck never touches the home it runs with
  assert.deepEqual(listing(home), before);
  return { exit, out, err };
}

/** Every path below the folder with its bytes. */
function listing(root: string) {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => {
      const path = join(entry.parentPath, entry.name);
      return [path, readFileSync(path, 'utf8')];
    });
}

const Rules = z.object({
  rules: z.array(z.object({ rule: z.string(), status: z.string(), reason: z.string().optional() })),
});

test('report prints one line per rule of the tracker, and no request reaches a local server', async t => {
  let requests = 0;
  const url = await listen(t, (_, response) => {
    requests += 1;
    response.end('{}');
  });
  const env = ['--env', 'TRACKER_TOKEN=test-token', '--env', `TRACKER_URL=${url}`];
  const { exit, out } = await adxcheck(t, 'report', '--output', 'text', ...env, '--', ...TRACKER);
  assert.deepEqual([exit, requests], [0, 0]);
  assert.equal(
    out,
    [
      'Raw JSON input           not probed   7 calls reached "tracker", which no fake stands for',
      'Schema at run time       met',
      'JSON when piped          met',
      'Input hardening          met',
      'Dry runs                 not probed   no recorder for "tracker": pass a fake to probe sends; 3 calls reached "tracker", which no fake stands for',
      'Agent skill              none named',
      'Checks in layers         not probed   no probe tells which layer refused a call',
      'Errors with a hint       not probed   no probe judges whether a hint says what to change',
      'All or nothing           not probed   no probe makes a write fail halfway',
      'Exit codes 0, 1, 2       not probed   31 calls reached "tracker", which no fake stands for, so their exit codes show nothing',
      'Plan before the file     not probed   no probe compares a plan with the file it writes',
      'Hints that run           not probed   12 calls reached "tracker", which no fake stands for; TICKET_NOT_FOUND, STILL_OPEN, USER_INACTIVE were never raised; 3 calls reached "tracker", which no fake stands for',
      'Options that list        not probed   6 calls reached "tracker", which no fake stands for',
      'Next steps               met',
      'Nothing passes silently  met',
      'Context discipline       not probed   no read without an output schema answered',
      '',
    ].join('\n'),
  );
});

test('report answers JSON when piped, one entry per rule', async t => {
  const { exit, out } = await adxcheck(
    t,
    'report',
    '--',
    'node',
    'tests/fixtures/hello.program.ts',
  );
  const { ok, result } = answerIn(out, Rules);
  assert.deepEqual(
    [exit, ok, result?.rules.length, result?.rules[1]],
    [0, true, 16, { rule: 'Schema at run time', status: 'met' }],
  );
});

test('run refuses one issue per broken rule, with the call in its message, and reruns itself', async t => {
  const leaky = ['node', 'tests/fixtures/leaky.program.ts'];
  const { exit, out } = await adxcheck(t, 'run', '--', ...leaky);
  const answer = answerIn(out, z.unknown());
  assert.equal(exit, 1);
  assert.deepEqual(
    [answer.kind, answer.issues?.map(i => [i.code, i.command])],
    ['fix', [['RULE_NOT_MET', 'adxcheck run -- node tests/fixtures/leaky.program.ts']]],
  );
  assert.match(answer.issues?.[0]?.message ?? '', /^Dry runs: hello save --json \{\} --dry-run /);
});

test('run exits 0 when every probed rule is met', async t => {
  const { exit, out } = await adxcheck(t, 'run', '--', 'node', 'tests/fixtures/hello.program.ts');
  assert.deepEqual([exit, answerIn(out, Rules).ok], [0, true]);
});

test('the skill is checked with --skill-file only, never from the home', async t => {
  const skilled = ['--', 'node', 'tests/fixtures/skilled.program.ts'];
  const lineOf = async (...file: string[]) => {
    const { out } = await adxcheck(t, 'report', '--output', 'text', ...file, ...skilled);
    return out.split('\n').find(line => line.startsWith('Agent skill'));
  };
  assert.deepEqual(
    [
      await lineOf('--skill-file', 'tests/fixtures/skill/SKILL.md'),
      await lineOf('--skill-file', 'tests/fixtures/skill/bare.md'),
      await lineOf(),
    ],
    [
      'Agent skill              named',
      'Agent skill              failed       the SKILL.md at tests/fixtures/skill/bare.md is no skill the kit can read',
      'Agent skill              not probed   pass --skill-file',
    ],
  );
});

test('adxcheck alone and --help answer what it takes, as a tool alone does', async t => {
  for (const args of [[], ['--help']]) {
    const { exit, out } = await adxcheck(t, ...args);
    const Started = z.object({
      name: z.string(),
      commands: z.array(z.object({ command: z.string() })),
    });
    const { result } = answerIn(out, Started);
    assert.deepEqual(
      [exit, result?.name, result?.commands.map(c => c.command)],
      [0, 'adxcheck', ['adxcheck report', 'adxcheck run']],
    );
  }
});

test('a wrong call of adxcheck is refused with all its mistakes, as adx refuses one', async t => {
  for (const [args, codes] of [
    [['check', '--', 'node', 'x.ts'], ['UNKNOWN_COMMAND']],
    [
      ['report', '--seed'],
      ['MISSING_VALUE', 'SCHEMA'],
    ],
    [
      ['report', '--nope', '--env', 'NOEQUALS', '--', 'node', 'x.ts'],
      ['UNKNOWN_OPTION', 'SCHEMA'],
    ],
    [
      ['run', '--seed', 'tests', '--seed', 'proto', 'stray', '--', 'node', 'x.ts'],
      ['REPEATED_OPTION', 'UNEXPECTED_ARGUMENT'],
    ],
    [['report', '--env', 'A=1', '--env', 'A=2', '--', 'node', 'x.ts'], ['REPEATED_OPTION']],
    [
      ['report', '--env', 'HOME=/tmp', '--env', 'ADX_FAKES_ONLY=1', '--', 'node', 'x.ts'],
      ['SCHEMA', 'SCHEMA'],
    ],
    [['report', '--seed', 'no/such/seed', '--', 'node', 'x.ts'], ['FILE_NOT_FOUND']],
    [['report', '--seed', 'package.json', '--', 'node', 'x.ts'], ['NOT_A_FOLDER']],
    [['report', '--', 'no-such-program-of-adx'], ['FILE_NOT_FOUND']],
    [['report', '--', 'node', '-e', 'console.log(1)'], ['SCHEMA']],
  ] as const) {
    const { exit, out } = await adxcheck(t, ...args);
    const answer = answerIn(out, z.unknown());
    assert.deepEqual([exit, answer.kind, answer.issues?.map(i => i.code)], [1, 'fix', codes]);
  }
});

test('a program that leaves a child behind does not hold adxcheck', async t => {
  const started = Date.now();
  const { exit } = await adxcheck(t, 'report', '--', 'sh', '-c', 'sleep 30 & echo {}');
  assert.deepEqual([exit, Date.now() - started < 20_000], [1, true]);
});

test('a signal to adxcheck removes its scratch folders and ends the program it checks', async t => {
  const { child, tmp, ended } = started(t, ['report', '--', 'sh', '-c', 'sleep 1000']);
  const scratched = () => readdirSync(tmp).filter(name => name.startsWith('adx-run-'));
  for (let waited = 0; scratched().length === 0 && waited < 5_000; waited += 50)
    await new Promise(resolve => setTimeout(resolve, 50));
  child.kill('SIGTERM');
  const [, , [exit]] = await ended;
  assert.deepEqual([scratched().length > 0 ? 'left' : 'removed', exit], ['removed', 143]);
});
