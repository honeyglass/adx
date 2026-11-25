/**
 * How conformance calls a tool in the process of the test, the same way for every probe.
 *
 * Asked, Called, Session, Caller: one call a probe asks for, what it left, the scratch folder
 * that calls share, and what makes such folders.
 * Context, Cleanup: what conformance uses of the test it runs in, and the part of it a check
 * that runs outside a test, such as adxcheck, gives too.
 * toolCaller: the caller of a tool that tool() made.
 * changedIn: each path two snapshots of a folder hold differently.
 * fakedBy: the remotes the fakes of the samples stand for, by name.
 *
 * Each session is a fresh scratch folder with the seed copied in, and each call in it goes
 * through the same call as main(), so what a probe sees is what the program answers. A session
 * notes what each call changed in its scratch folder and at the top of the test's working
 * directory, where a handler that writes around adx lands, and which requests reached the fakes.
 * What a handler writes with console stands before the answer, as in the program.
 *
 * @example const caller = toolCaller(tracker, samples);
 */
import { RefusalError } from '@honeyglass/utils/ts';
import { captured, nonce, snapshot, testFolder, tokensOf } from "../node/index.js";
import { FAKES_ONLY, heard, nameOf } from "../remote/index.js";
import { call, inScratch, specOf } from "../tool/index.js";
/**
 * @param tool - the value tool() returned
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a fix RefusalError for a tool that tool() did not make
 */
export function toolCaller(tool, samples) {
    const shell = specOf(tool);
    if (shell === undefined) {
        throw new RefusalError({
            kind: 'fix',
            step: 'conformance',
            reason: 'the tool was not made by tool() of this adx',
            next: 'pass the value that tool() returned',
        });
    }
    const sent = [];
    const fakes = (samples.fakes ?? []).map(made => heard(made, route => sent.push(route)));
    const closedBy = nonce();
    const scene = { ...samples, env: { ...samples.env, [FAKES_ONLY]: closedBy }, fakes };
    return {
        faked: fakedBy(samples),
        closedBy,
        session: work => inScratch(shell, scene, around => work(sessionIn(shell, around, sent))),
        watched: 'in the process the kit watches the scratch folder and the top of the working directory of the test, not the temp folder; conformance with the command line watches every folder the program gets',
    };
}
// The requests of one call are those the fakes heard while it ran: calls of a session run one
// after another.
function sessionIn(shell, around, sent) {
    const folder = around.confined ?? around.cwd;
    return {
        call: async (asked) => {
            const before = snapshot(folder);
            const outside = testFolder();
            sent.length = 0;
            const piped = asked.stdin ?? null;
            const stdin = async () => (piped === null ? null : { text: piped });
            const tokens = tokensOf(asked.argv);
            const ran = await captured(() => call(shell, { ...around, tokens, tty: false, stdin }));
            return {
                ...asked,
                exit: ran.data.exit,
                out: `${ran.out}${ran.data.out}`,
                err: `${ran.err}${ran.data.err}`,
                changed: [
                    ...changedIn(before, snapshot(folder)),
                    ...changedIn(outside, testFolder()).map(name => `${name} in the working directory of the test`),
                ],
                sent: [...sent],
            };
        },
    };
}
/** @returns the path of each entry that is new, gone or different */
export const changedIn = (before, after) => [...new Set([...before.keys(), ...after.keys()])].filter(rel => before.get(rel) !== after.get(rel));
/** @returns the name of each remote the samples give a fake for */
export const fakedBy = (samples) => (samples.fakes ?? []).flatMap(made => nameOf(made.remote) ?? []);
