/**
 * The test kit's check of a whole tool: every probe of the Agent DX rules adx builds in, as one
 * subtest each of the test that calls it.
 *
 * conformance: probes a tool in the process of the test, or a command line as a real program.
 *
 * Both run the same probes, each call in a fresh scratch folder with the seed copied in and the
 * fakes in place of the servers. A probe whose calls broke its rule fails with one finding per
 * call. The agent skill and the stored data need the folder of the tool's package.json, which
 * comes from packageFolder() alone; while it is not known, both are todos. A program shows
 * neither its skill path nor its stored schemas, so the kit checks them only in the process.
 *
 * @example test('hello keeps the agent rules', t => conformance(t, hello, samples));
 */
import { RefusalError } from '@honeyglass/utils/ts';
import { specOf } from '../tool/index.ts';
import { toolCaller } from './caller.ts';
import type { Context } from './caller.ts';
import { skillFindings, storedFindings } from './kept.ts';
import { packageFolder } from './package.ts';
import { PROBES } from './probes.ts';
import type { Probe } from './probes.ts';
import { Probing } from './probing.ts';
import { programCaller } from './program.ts';
import type { Checked, Samples } from './run.ts';

/**
 * @param t - the test, whose subtests the probes are
 * @param target - the tool tool() made, or the command line that starts it
 * @param samples - the variables, the seed and the fakes every call gets
 * @throws a fix RefusalError when the target cannot be probed, and per probe in its subtest
 */
export async function conformance(
  t: Context,
  target: Checked | readonly string[],
  samples: Samples = {},
) {
  const caller =
    'main' in target ? toolCaller(target, samples) : await programCaller(t, target, samples);
  const probing = new Probing(caller);
  const known = await probing.known();
  for (const probe of PROBES) {
    await t.test(probe.name, async sub => {
      failedOn(probe, await probe.findings(probing, known));
      if (probe.example === true && known.unexampled.length > 0)
        sub.todo(`not probed without an example: ${known.unexampled.join(', ')}`);
    });
  }
  const shell = 'main' in target ? specOf(target) : undefined;
  await t.test('agent skill', async sub => {
    if (shell === undefined) return sub.todo('only conformance with the tool reads the skill path');
    const { skill } = shell;
    if (skill === undefined) return;
    const folder = packageFolder();
    if (folder === undefined) return sub.todo('the folder of package.json is not known yet');
    failedOn(SKILL, skillFindings(folder, skill));
  });
  await t.test('stored data', async sub => {
    if (shell === undefined)
      return sub.todo('only conformance with the tool reads the stored schemas');
    if (shell.stored.length === 0) return;
    const folder = packageFolder();
    if (folder === undefined) return sub.todo('the folder of package.json is not known yet');
    failedOn(STORED, storedFindings(folder, shell.stored));
  });
}

const SKILL = {
  name: 'agent skill',
  next: 'name a file that starts with a frontmatter with name and description',
};

const STORED = {
  name: 'stored data',
  next: 'raise the format number of a kind whose schema changed',
};

function failedOn(probe: Pick<Probe, 'name' | 'next'>, findings: readonly string[]) {
  if (findings.length === 0) return;
  throw new RefusalError({
    kind: 'fix',
    step: 'conformance',
    reason: `${findings.length} of the probed calls broke ${probe.name}`,
    next: probe.next,
    cause: findings.join('\n'),
  });
}
