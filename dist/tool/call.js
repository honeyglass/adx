/**
 * One call of a tool: the arguments routed to a command, and the answer in JSON or as text.
 *
 * call: the exit code and what the call writes, for main() and for the test kit's run().
 *
 * The one $try of adx around a whole call stands here, since main() and run() share it. Below it,
 * nothing catches a bug, so a programming error reaches it and is answered as UNKNOWN_ERROR.
 *
 * @example const ran = await call(spec, { argv: ['greet', '--name', 'Ada'], tty: false });
 */
import { $try } from '@honeyglass/utils/ts';
import { answererOf, givenOf } from "../command/index.js";
import { answerOfError, exitOf, NOTHING_CHANGED, refusalAnswer, refusedWith, unknownCommand, } from "../core/index.js";
import { textOf } from "./text.js";
/**
 * @param spec - the spec of the tool
 * @param around - the arguments, and whether stdout is a terminal
 * @returns the exit code, the answer for stdout, and for a bug the error for stderr; it never rejects
 */
export async function call(spec, around) {
    const answering = async () => written(await answered(spec, around.argv), around.tty);
    const { data, error } = await $try(answering);
    if (error === null)
        return data;
    const { answer, err } = answerOfError(error);
    return { ...written(answer, around.tty), err };
}
async function answered(spec, argv) {
    const [word = '', ...words] = argv;
    const answerer = answererIn(spec.commands, word);
    if (answerer === undefined) {
        return refused([unknownCommand.issue(`${spec.name} has no command ${word}`)]);
    }
    const { given, issues } = givenOf(words);
    if (issues.length > 0)
        return refused(issues);
    return answerer(given);
}
// A key the table holds as its own, so a word such as toString finds no command.
function answererIn(commands, word) {
    const entry = Object.hasOwn(commands, word) ? commands[word] : undefined;
    return entry === undefined ? undefined : answererOf(entry);
}
function refused(issues) {
    const [first, ...rest] = issues;
    return refusalAnswer(refusedWith([first, ...rest], NOTHING_CHANGED));
}
// Text at a terminal, else one JSON document, so a program that reads the answer parses it.
function written(answer, tty) {
    const out = tty ? textOf(answer) : `${JSON.stringify(answer)}\n`;
    return { exit: exitOf(answer), out, err: '' };
}
