/**
 * One call of a tool: the arguments routed to `schema`, a command, the start answer or a group,
 * and the answer in JSON or as text.
 *
 * call: the exit code and what the call writes, for main() and for the test kit's run().
 *
 * The one $try of adx around a whole call stands here, since main() and run() share it. Below it,
 * nothing catches a bug, so a programming error reaches it and is answered as UNKNOWN_ERROR.
 *
 * @example const ran = await call(shell, { tokens: tokensOf(['greet']), tty: false, stdin });
 */
import { $try } from '@honeyglass/utils/ts';
import { listed, refused, route } from "../command/index.js";
import { answerOfError, exitOf } from "../core/index.js";
import { namesSchema, schemaAnswer } from "./schema.js";
import { setupIssues } from "./setup.js";
import { started } from "./start.js";
import { textOf } from "./text.js";
import { through } from "./through.js";
/**
 * @param shell - what the call reads of the tool
 * @param around - the tokens of the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export async function call(shell, around) {
    const answering = async () => written(await answered(shell, around), around.tty);
    const { data, error } = await $try(answering);
    if (error === null)
        return data;
    const { answer, err } = answerOfError(error);
    return { ...written({ answer }, around.tty), err };
}
// The setup first, so a mistake in it shows on every call, then the words, then the command.
async function answered(shell, { tokens, stdin }) {
    const [wrong, ...more] = setupIssues(shell);
    if (wrong !== undefined)
        return refused([wrong, ...more]);
    if (namesSchema(tokens))
        return schemaAnswer(shell, tokens);
    const routed = route(shell.commands, tokens, shell.name);
    if (routed.found === 'command')
        return commandAnswered(shell, routed, stdin);
    if (routed.found === 'group' && routed.words.length === 0)
        return started(shell);
    if (routed.found === 'group')
        return listed(routed.table, [shell.name, ...routed.words]);
    const [first, ...rest] = routed.issues;
    return refused([first, ...rest]);
}
// Help, --fields alone and a mistake in the arguments end the call before its handler.
async function commandAnswered(shell, routed, stdin) {
    const read = await routed.runner.read(routed.rest, routed.before, stdin);
    return 'answer' in read ? read : through(shell, { runner: routed.runner, ...read });
}
// Text at a terminal, else one JSON document, so a program that reads the answer parses it.
function written({ answer, text, err }, tty) {
    const out = tty ? textOf(answer, text) : `${JSON.stringify(answer)}\n`;
    return { exit: exitOf(answer), out, err: err ?? '' };
}
