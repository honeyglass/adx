/**
 * One call of a tool: the arguments routed to `schema`, a command, the start answer, a group or
 * --version, and the answer in JSON or as text: the form --output forces, else text at a
 * terminal and JSON when piped.
 *
 * call: the exit code and what the call writes, for main() and for the test kit's run().
 *
 * The one $try of adx around a whole call stands here, since main() and run() share it. Below it,
 * nothing catches a bug, so a programming error reaches it and is answered as UNKNOWN_ERROR.
 *
 * @example const ran = await call(shell, { tokens: tokensOf(['greet']), tty: false, stdin });
 */
import { $try } from '@honeyglass/utils/ts';
import { formOf, listed, refused, route } from "../command/index.js";
import { answerOfError, exitOf } from "../core/index.js";
import { Located, within } from "../files/index.js";
import { Line } from "../remote/index.js";
import { namesSchema, schemaAnswer } from "./schema.js";
import { setupIssues } from "./setup.js";
import { started } from "./start.js";
import { textOf } from "./text.js";
import { through } from "./through.js";
import { namesVersion, versionAnswer } from "./version.js";
/**
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export async function call(shell, around) {
    const read = formOf(around.tokens, shell.name);
    const tty = 'form' in read && read.form !== undefined ? read.form === 'text' : around.tty;
    const answering = async () => written(await answered(shell, around, read), tty);
    const { data, error } = await $try(answering);
    if (error === null)
        return data;
    const { answer, err } = answerOfError(error);
    return { ...written({ answer }, tty), err };
}
// The setup first, so a mistake in it shows on every call, then --output, then the words, then
// the command.
async function answered(shell, around, read) {
    const [wrong, ...more] = setupIssues(shell, around.network);
    if (wrong !== undefined)
        return refused([wrong, ...more]);
    if ('answered' in read)
        return read.answered;
    if ('issues' in read)
        return refused(read.issues);
    const { tokens } = read;
    if (namesVersion(tokens))
        return versionAnswer(shell);
    if (namesSchema(tokens))
        return schemaAnswer(shell, tokens);
    const routed = route(shell.commands, tokens, shell.name);
    if (routed.found === 'command')
        return commandAnswered(shell, routed, around);
    if (routed.found === 'group' && routed.words.length === 0)
        return startedIn(shell, around);
    if (routed.found === 'group')
        return listed(routed.table, [shell.name, ...routed.words]);
    const [first, ...rest] = routed.issues;
    return refused([first, ...rest]);
}
// Help, --fields alone and a mistake in the arguments end the call before its handler.
async function commandAnswered(shell, routed, around) {
    const read = await routed.runner.read(routed.rest, routed.before, around.stdin);
    return 'answer' in read ? read : through(shell, { runner: routed.runner, ...read }, around);
}
// The first steps carry a folder the variable moved, as every step does (decision 13). `start`
// may read a server, as any handler may.
async function startedIn(shell, around) {
    const roots = new Located(shell, around, {});
    const [missing, ...more] = roots.issues();
    if (missing !== undefined)
        return refused([missing, ...more]);
    const line = new Line(shell, around);
    return within(roots, () => line.run(() => started(shell, roots.moved())));
}
// Text at a terminal, else one JSON document, so a program that reads the answer parses it.
function written({ answer, text, err }, tty) {
    const out = tty ? textOf(answer, text) : `${JSON.stringify(answer)}\n`;
    return { exit: exitOf(answer), out, err: err ?? '' };
}
