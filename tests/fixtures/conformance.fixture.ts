// The tools of tools.ts under conformance; conformance.api.spec.ts runs this file in a scratch
// working directory and reads which probes fail. Each path is absolute for that reason.
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { test } from 'node:test';
import { conformance, fake } from '@honeyglass/adx/test';
import * as tools from './tools.ts';

const here = import.meta.dirname;
const program = (name: string) => ['node', join(here, `${name}.program.ts`)];
const samples = { fakes: [fake(tools.api, tools.routes)], seed: join(here, 'seed') };
const fakes = { fakes: [fake(tools.api, tools.routes)] };

test('hello', t => conformance(t, tools.hello, samples));
test('hello as a program', t => conformance(t, program('hello'), samples));
test('quoting', t => conformance(t, tools.quoting));
test('noisy', t => conformance(t, tools.noisy));
test('unlisted', t => conformance(t, tools.unlisted));
test('unbounded', t => conformance(t, tools.unbounded));
test('unwritten', t => conformance(t, tools.unwritten));
test('broken', t => conformance(t, tools.broken));
test('leaky', t => conformance(t, tools.leaky));
test('leaky as a program', t => conformance(t, program('leaky')));
test('sending as a program', t => conformance(t, program('sending'), fakes));
test('loose', t => conformance(t, tools.loose));
test('listless', t => conformance(t, tools.listless));
test('commandless', t => conformance(t, tools.commandless));
test('templated', t => conformance(t, tools.templated));
test('unstarted', t => conformance(t, tools.unstarted));
test('unprintable', t => conformance(t, tools.unprintable));
test('unexampled', t => conformance(t, tools.unexampled));
test('misgiven', t => conformance(t, tools.misgiven));
test('unquoted', t => conformance(t, tools.unquoted));
test('skilled', t => conformance(t, tools.skilled, { skillFile: join(here, 'skill', 'SKILL.md') }));
test('skilled without a skill file', t => conformance(t, tools.skilled));
test('skilled with a bare file', t =>
  conformance(t, tools.skilled, { skillFile: join(here, 'skill', 'bare.md') }));
test('skilled with no file', t =>
  conformance(t, tools.skilled, { skillFile: join(here, 'skill', 'none.md') }));
test('escaped as a program', t => conformance(t, program('escaped'), samples));
// a file named like a word of the command line is no path, as a word without a slash: the first
// word comes from PATH, and the value of an option stays as it is
test('hello as a program beside files named like its words', async t => {
  writeFileSync('node', '#!/bin/sh\nexit 3\n', { mode: 0o755 });
  mkdirSync('strict');
  t.after(() => rmSync('node'));
  t.after(() => rmSync('strict', { recursive: true }));
  const [node = '', ...rest] = program('hello');
  await conformance(t, [node, '--unhandled-rejections', 'strict', ...rest], samples);
});
test('fixed as a program', t =>
  conformance(t, program('hello'), { fakes: [fake(tools.api, {}), fake(tools.fixed, {})] }));
// a server on the machine itself is no fake the kit started, so no probe reaches it
test('hello as a program beside a local server', async t => {
  let requests = 0;
  const server = createServer((_, response) => {
    requests += 1;
    response.end('{}');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  await conformance(t, program('hello'), { env: { HELLO_URL: `http://127.0.0.1:${port}` } });
  assert.equal(requests, 0);
});
