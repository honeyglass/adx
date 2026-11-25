/**
 * How conformance calls a tool as a real program, started from its command line.
 *
 * programCaller: the caller of a command line, such as ['node', 'bin/tracker.ts'].
 * kitVariableIssues: one issue per variable of the samples that the kit sets itself.
 *
 * Each session is a fresh scratch folder with a home, a temp folder and a working directory.
 * Each root the tool names with a variable lies in the scratch folder too, with the seed copied
 * in, so the program never reaches the person's data; a root whose name or variable has not its
 * form is refused before a folder is made (decision 90). Each fake answers on a local port, and the
 * variable of its remote's address points the program there. ADX_FAKES_ONLY, a fresh token, closes
 * the program's network to the origins ADX_FAKE_ORIGINS names, those of the fakes, so a remote
 * without a fake reaches no server, not even one on the machine itself (decision 86). The roots
 * come from `tool schema`, which the caller reads once in a bare session.
 *
 * The kit sets PATH, HOME, TMPDIR, the two variables above, the variable of each root and the
 * address of each fake; a variable of the samples cannot replace them, and naming one is refused.
 *
 * @example const caller = await programCaller(t, ['node', 'bin/tracker.ts'], samples);
 */
import { $try } from '@honeyglass/utils/ts';
import { nameIssue, NOTHING_CHANGED, refusedWith, schemaFailed, urlNotAllowed, } from "../core/index.js";
import { nonce, program, scratch, seeded, serve, snapshot } from "../node/index.js";
import { FAKE_ORIGINS, FAKES_ONLY, fakeAnswer, heard, urlVariableOf } from "../remote/index.js";
import { answerIn, Overview, resultOf } from "./answer.schema.js";
import { changedIn, fakedBy } from "./caller.js";
/**
 * @param t - what closes the servers of the fakes when the check ends
 * @param words - the command line that starts the tool
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a refusal URL_NOT_ALLOWED for a fake whose remote has a fixed address, and SCHEMA at
 * `env` for a variable of the samples the kit sets itself
 */
export async function programCaller(t, words, samples) {
    const sent = [];
    const fakes = (samples.fakes ?? []).map(made => ({ made, variable: variableOf(made) }));
    // One server after another, each closed when the test ends, so none is left listening.
    const addresses = [];
    for (const { made, variable } of fakes) {
        const recorded = heard(made, route => sent.push(route));
        const server = await serve((method, path) => fakeAnswer(recorded, method, path));
        t.after(server.close);
        addresses.push([variable, server.url]);
    }
    const token = nonce();
    // a fake's server answers at the root of its origin, so its url is its origin
    const origins = addresses.map(([, url]) => url).join(',');
    const kit = { ...Object.fromEntries(addresses), [FAKES_ONLY]: token, [FAKE_ORIGINS]: origins };
    const env = { ...samples.env, ...kit };
    const bare = { words, env };
    const roots = await rootsOf(bare, sent);
    const kitVariables = [...Object.keys(kit), ...roots.map(({ variable }) => variable)];
    const [wrong, ...more] = kitVariableIssues(samples.env ?? {}, kitVariables);
    if (wrong !== undefined)
        throw refusedWith([wrong, ...more], NOTHING_CHANGED);
    const run = { words, env, ...(samples.seed === undefined ? {} : { seed: samples.seed }) };
    return {
        faked: fakedBy(samples),
        closedBy: token,
        session: work => inSession(run, roots, sent, work),
        watched: 'the kit watches the scratch folder, which holds the home, temp and working folders of the program',
    };
}
// The address of the remote is the one value of its fake the program reads, from its variable.
// Every fake is checked before the first server starts.
function variableOf(made) {
    const variable = urlVariableOf(made.remote);
    if (variable !== undefined)
        return variable;
    const message = 'a fake stands for a remote with a fixed address, so the program cannot reach it: give the remote its address with envUrl';
    throw refusedWith([urlNotAllowed.issue(message)], NOTHING_CHANGED);
}
/** The variables the kit always sets: a definition, from node/program.ts and this file. */
const KIT_VARIABLES = ['PATH', 'HOME', 'TMPDIR', FAKES_ONLY, FAKE_ORIGINS];
/**
 * @param env - the variables of the samples
 * @param more - the variables the kit sets for this tool, such as those of its roots
 * @returns one SCHEMA issue at `env` per variable the kit sets itself
 */
export function kitVariableIssues(env, more = []) {
    const taken = new Set([...KIT_VARIABLES, ...more]);
    return Object.keys(env)
        .filter(variable => taken.has(variable))
        .map((variable) => schemaFailed.at('env', `${variable} is a variable the test kit sets itself`));
}
// Each root with a variable, by that variable.
async function rootsOf(bare, sent) {
    const called = await inSession(bare, [], sent, session => session.call({ argv: ['schema'] }));
    const overview = resultOf(answerIn(called.out).answer, Overview);
    return (overview?.roots ?? []).flatMap(({ root, variable }) => variable === undefined ? [] : [{ root, variable }]);
}
// A root's name and variable come from the program, which may be no tool of adx, and the name
// builds a folder of the scratch, so each keeps to its form before the scratch is made.
async function inSession(run, roots, sent, work) {
    const [unnamed, ...more] = roots.flatMap(({ root, variable }) => [nameIssue('root', root), nameIssue('variable', variable)].filter(issue => issue !== undefined));
    if (unnamed !== undefined)
        throw refusedWith([unnamed, ...more], NOTHING_CHANGED);
    const made = scratch(undefined);
    const placed = roots.map(({ root, variable }) => ({
        variable,
        folder: `${made.folder}/roots/${root}`,
    }));
    const env = { ...run.env, ...Object.fromEntries(placed.map(p => [p.variable, p.folder])) };
    const session = {
        call: async (asked) => {
            const before = snapshot(made.folder);
            sent.length = 0;
            const ran = await program(run.words, {
                argv: asked.argv,
                cwd: made.cwd,
                home: made.home,
                tmp: made.tmp,
                env,
                stdin: asked.stdin ?? null,
            });
            return {
                ...asked,
                ...ran,
                changed: changedIn(before, snapshot(made.folder)),
                sent: [...sent],
            };
        },
    };
    // The seed is copied inside the one $try, so a seed that cannot be copied removes the scratch
    // too.
    const { data, error } = await $try(() => {
        if (placed.length > 0)
            made.disk.makeFolder(`${made.folder}/roots`, 0o700);
        for (const { folder } of placed) {
            if (run.seed === undefined)
                made.disk.makeFolder(folder, 0o700);
            else
                seeded(run.seed, folder);
        }
        return work(session);
    });
    made.remove();
    if (error !== null)
        throw error;
    return data;
}
