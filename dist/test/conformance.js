/**
 * The test kit's check of a whole tool: every probe of the Agent DX rules adx builds in, as one
 * subtest each of the test that calls it.
 *
 * conformance: probes a tool in the process of the test, or a command line as a real program.
 *
 * Both run the same probes, each call in a fresh scratch folder with the seed copied in and the
 * fakes in place of the servers. A probe whose calls broke its rule fails with one finding per
 * call. The agent skill is the SKILL.md that samples.skillFile names, found by its name in a
 * scratch home; a tool that names a skill and no such file fails the check, since a todo would
 * pass. The stored data lies next to the tool's package.json, which comes from packageFolder()
 * alone; while it is not known, its check is a todo. A program shows neither its skill nor its
 * stored schemas, so the kit checks them only in the process.
 *
 * @example test('hello keeps the agent rules', t => conformance(t, hello, samples));
 */
import { RefusalError } from '@honeyglass/utils/ts';
import { specOf } from "../tool/index.js";
import { toolCaller } from "./caller.js";
import { storedFindings } from "./kept.js";
import { packageFolder } from "./package.js";
import { PROBES } from "./probes.js";
import { Probing } from "./probing.js";
import { programCaller } from "./program.js";
import { skillFailure } from "./skill.js";
/**
 * @param t - the test, whose subtests the probes are
 * @param target - the tool tool() made, or the command line that starts it
 * @param samples - the variables, the seed and the fakes every call gets
 * @throws a fix RefusalError when the target cannot be probed, and per probe in its subtest
 */
export async function conformance(t, target, samples = {}) {
    const caller = 'main' in target ? toolCaller(target, samples) : await programCaller(t, target, samples);
    const probing = new Probing(caller);
    const known = await probing.known();
    for (const probe of PROBES) {
        await t.test(probe.name, async (sub) => {
            const findings = await probe.findings(probing, known);
            const reason = `${findings.length} of the probed calls broke ${probe.name}`;
            if (findings.length > 0)
                failedOn({ next: probe.next, reason, findings });
            if (probe.example === true && known.unexampled.length > 0)
                sub.todo(`not probed without an example: ${known.unexampled.join(', ')}`);
        });
    }
    const shell = 'main' in target ? specOf(target) : undefined;
    await t.test('agent skill', async (sub) => {
        if (shell === undefined)
            return sub.todo('only conformance with the tool reads the skill');
        const { skill } = shell;
        if (skill === undefined)
            return;
        const failure = skillFailure(skill, samples.skillFile);
        if (failure !== undefined)
            failedOn(failure);
    });
    await t.test('stored data', async (sub) => {
        if (shell === undefined)
            return sub.todo('only conformance with the tool reads the stored schemas');
        if (shell.stored.length === 0)
            return;
        const folder = packageFolder();
        if (folder === undefined)
            return sub.todo('the folder of package.json is not known yet');
        const findings = storedFindings(folder, shell.stored);
        if (findings.length > 0)
            failedOn({ ...STORED, findings });
    });
}
const STORED = {
    reason: 'a stored schema no longer matches its fingerprint in adx.stored.json',
    next: 'raise the format number of a kind whose schema changed',
};
// A probe fails by its calls, a file check by the file it read, so each brings its own reason.
function failedOn({ next, reason, findings }) {
    throw new RefusalError({
        kind: 'fix',
        step: 'conformance',
        reason,
        next,
        cause: findings.join('\n'),
    });
}
