/**
 * One call of a command answered as its tool answers it, for main() and for invoke.
 *
 * through: the answer of the handler with the steps after a success, or the refusal with the
 * command that helps each issue, all within the roots of the call.
 * invoked: the same for invoke, in scratch folders with the seed and the variables of a test.
 *
 * A success gets the command's own `next`, then each `after` of the tool for it, in their order;
 * a dry run gets one step instead, the same call for real. An issue keeps the command it names;
 * a SCHEMA issue gets the schema of the shape it lies in, or of the command; any other gets the
 * step of the tool's hint for its code, else, at a field with a source, the call that lists the
 * field's values. Each step is written out with the input of the call, so it carries the call's
 * global fields, the folders it moved and the fields it carries. A folder the call moved must be
 * there before anything runs (decision 13).
 *
 * The $try here answers a refusal of adx only, which the schema, a list, `check`, a handler and
 * failed() throw or return, of any kind. Any other error is thrown again as it came, on the line
 * after the $try: a bug flies on to the one catch of the call, in main() or in invoke.
 *
 * @example const answered = await through(shell, { runner, input, run }, around);
 */
import { $try } from '@honeyglass/utils/ts';
import { followsOf, refused, runnerOf } from "../command/index.js";
import { answerOfRefused, commandStep, placeOf, Refused, refusedOf, stepOf, } from "../core/index.js";
import { Located, staging, within } from "../files/index.js";
import { shapeNameAt } from "../shapes/index.js";
import { hintFor, schema, stepAnswer } from "../steps/index.js";
import { sources } from "../values/index.js";
import { inScratch } from "./scene.js";
/**
 * @param shell - what the call reads of the tool
 * @param call - the command, the input as its caller gave it, and what the run is asked for
 * @param around - the variables, folders and disk of the call
 * @returns the answer of the call
 * @throws any error that is no refusal of adx, as it came
 */
export async function through(shell, call, around) {
    const roots = new Located(shell, around, call.run.folders);
    const [missing, ...more] = roots.issues();
    if (missing !== undefined)
        return refused([missing, ...more]);
    return within(roots, () => answeredIn(shell, call, roots));
}
/** @param call - the command, its input, its run, and the samples of the test that invokes it */
export function invoked(shell, call) {
    return inScratch(shell, call.scene, around => through(shell, call, around));
}
async function answeredIn(shell, call, roots) {
    const input = isRecord(call.input) ? call.input : {};
    const context = { tool: shell.name, input, folders: roots.moved() };
    const writer = staging({
        replace: call.runner.spec.replace,
        replacing: call.run.replace,
        retry: () => commandStep(call.runner, input, ['replace', 'dry-run']),
    });
    const { data, error } = await $try(() => succeeded(shell, call, context, writer));
    if (error === null)
        return data;
    if (error instanceof Refused === false)
        throw error;
    const refused = refusedOf(error);
    return answerOfRefused(refused, await helped(shell, call.runner, refused.issues, context));
}
// A dry run names the same call for real, with the --replace it was given.
async function succeeded(shell, call, context, writer) {
    const answered = await call.runner.answered(call.input, call.run, writer);
    if (answered.ran === undefined)
        return answered;
    const replacing = call.run.replace && call.runner.spec.replace === undefined;
    const steps = answered.answer.applied === false
        ? [commandStep(call.runner, context.input, replacing ? ['replace'] : [])]
        : stepsAfter(shell, call.runner, answered.ran);
    const next = await Promise.all(steps.map(step => stepAnswer(step, context)));
    if (next.length === 0)
        return answered;
    return { ...answered, answer: { ...answered.answer, next } };
}
function stepsAfter(shell, runner, ran) {
    const own = runner.spec.next?.(ran.result, ran.input) ?? [];
    const afters = shell.next.flatMap(after => {
        const follows = followsOf(after);
        if (follows === undefined)
            return [];
        const listed = follows.commands.some(command => runnerOf(command) === runner);
        return listed ? follows.next(ran.result, ran.input) : [];
    });
    return [...own, ...afters];
}
// The command an issue names wins, then the schema a SCHEMA issue lies in, then the tool's hint
// for its code, then the source of the field the issue stands at (decisions 72, 73 and 78).
function helped(shell, runner, issues, context) {
    return Promise.all(issues.map(async (issue) => {
        const field = issue.path?.[0];
        const step = stepOf(issue) ??
            schemaStepOf(shell, runner, issue) ??
            hintFor(shell.hints, issue.code) ??
            (field === undefined ? undefined : sources.listStep(runner, field, context.input));
        if (step === undefined)
            return issue;
        const { does, command } = await stepAnswer(step, context);
        return issue.command(command === undefined ? { does } : { does, command });
    }));
}
// A SCHEMA issue inside a shape of the tool shows that shape, any other the command that ran.
function schemaStepOf(shell, runner, issue) {
    const place = placeOf(issue);
    if (place === undefined)
        return undefined;
    const name = shapeNameAt(shell.shapes, place);
    return name === undefined ? runner.schemaStep() : schema.step(name);
}
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
