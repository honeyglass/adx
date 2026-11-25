/**
 * The checks of conformance, each with the outcome it finds, so a test and a report read the same.
 *
 * Check, checksOf: one check by its name, and every check of a tool or a command line.
 *
 * Both targets run the same probes, each call in a fresh scratch folder with the seed copied in
 * and the fakes in place of the servers. A probe whose calls broke its rule fails with one
 * finding per call. The agent skill is the SKILL.md that samples.skillFile names, found by its
 * name in a scratch home; a tool that names a skill and no such file fails the check, since a
 * todo would pass. The stored data lies next to the tool's package.json, which comes from
 * packageFolder() alone; while it is not known, its check is a todo. A program shows neither its
 * skill nor its stored schemas, so the kit checks them only in the process.
 *
 * @example for (const check of await checksOf(t, hello, samples)) await check.outcome();
 */
import { specOf } from '../tool/index.ts';
import type { Shell } from '../tool/index.ts';
import { toolCaller } from './caller.ts';
import type { Context } from './caller.ts';
import { storedFindings } from './kept.ts';
import { packageFolder } from './package.ts';
import { PROBES } from './probes.ts';
import type { Probe } from './probes.ts';
import { Probing } from './probing.ts';
import type { Known } from './probing.ts';
import { programCaller } from './program.ts';
import type { Outcome } from './rules.ts';
import type { Checked, Samples } from './run.ts';
import { skillFailure } from './skill.ts';

export type Check = { name: string; outcome: () => Promise<Outcome> };

/**
 * @param t - the test, or what stands for it, which closes the servers of the fakes when it ends
 * @param target - the tool tool() made, or the command line that starts it
 * @param samples - the variables, the seed and the fakes every call gets
 * @returns the checks in the order they run; each probe calls only when its outcome is asked
 * @throws a fix RefusalError when the target cannot be probed
 */
export async function checksOf(
  t: Context,
  target: Checked | readonly string[],
  samples: Samples,
): Promise<Check[]> {
  const caller =
    'main' in target ? toolCaller(target, samples) : await programCaller(t, target, samples);
  const probing = new Probing(caller);
  const known = await probing.known();
  const shell = 'main' in target ? specOf(target) : undefined;
  return [
    ...PROBES.map(probe => ({
      name: probe.name,
      outcome: () => probed(probe, probing, known),
    })),
    { name: 'agent skill', outcome: async () => skillOutcome(shell, samples) },
    { name: 'stored data', outcome: async () => storedOutcome(shell) },
  ];
}

async function probed(probe: Probe, probing: Probing, known: Known): Promise<Outcome> {
  const findings = await probe.findings(probing, known);
  const reason = `${findings.length} of the probed calls broke ${probe.name}`;
  if (findings.length > 0) return { failed: { next: probe.next, reason, findings } };
  const idle = probe.idle?.(known);
  const todo =
    probe.example === true && known.unexampled.length > 0
      ? `not probed without an example: ${known.unexampled.join(', ')}`
      : undefined;
  return { ...(todo === undefined ? {} : { todo }), ...(idle === undefined ? {} : { idle }) };
}

function skillOutcome(shell: Shell | undefined, samples: Samples): Outcome {
  if (shell === undefined) return { todo: 'only conformance with the tool reads the skill' };
  if (shell.skill === undefined) return { subject: false };
  const failure = skillFailure(shell.skill, samples.skillFile);
  return failure === undefined ? { subject: true } : { subject: true, failed: failure };
}

function storedOutcome(shell: Shell | undefined): Outcome {
  if (shell === undefined)
    return { todo: 'only conformance with the tool reads the stored schemas' };
  if (shell.stored.length === 0) return { subject: false };
  const folder = packageFolder();
  if (folder === undefined)
    return { subject: true, todo: 'the folder of package.json is not known yet' };
  const findings = storedFindings(folder, shell.stored);
  return findings.length === 0
    ? { subject: true }
    : { subject: true, failed: { ...STORED, findings } };
}

const STORED = {
  reason: 'a stored schema no longer matches its fingerprint in adx.stored.json',
  next: 'raise the format number of a kind whose schema changed',
};
