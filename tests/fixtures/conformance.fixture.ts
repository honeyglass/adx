// The tools of tools.ts under conformance; conformance.api.spec.ts runs this file in a scratch
// working directory and reads which probes fail. Each path is absolute for that reason.
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
test('fixed as a program', t =>
  conformance(t, program('hello'), { fakes: [fake(tools.api, {}), fake(tools.fixed, {})] }));
