/**
 * The setup of a tool that the compiler cannot see, checked at the start of every call.
 *
 * setupIssues: one DECLARATION issue per mistake: in the command table, per command an `after`
 * names that the tool does not list, per code that has a second hint, and per shape that is no
 * word or has the word of a command.
 *
 * @example const [wrong, ...more] = setupIssues(shell);
 */
import { declarationIssues, followsOf, isWord, runnerOf, runnersIn } from "../command/index.js";
import { declaration } from "../core/index.js";
import { codeOf } from "../steps/index.js";
/** @param shell - what the call reads of the tool */
export function setupIssues(shell) {
    return [
        ...declarationIssues(shell.commands),
        ...afterIssues(shell),
        ...hintIssues(shell),
        ...shapeIssues(shell),
    ];
}
// `schema <word>` names a shape or a command; a group may share its word, and the shape wins.
function shapeIssues(shell) {
    return Object.keys(shell.shapes).flatMap(name => {
        if (isWord(name) === false) {
            const message = `the shape ${JSON.stringify(name)} is no word of letters, digits and -`;
            return [declaration.issue(message)];
        }
        const entry = Object.hasOwn(shell.commands, name) ? shell.commands[name] : undefined;
        if (entry === undefined || runnerOf(entry) === undefined)
            return [];
        return [
            declaration.issue(`the shape ${name} has the word of the command ${shell.name} ${name}`),
        ];
    });
}
// Two hints for one code would leave the command of its issues to their order.
function hintIssues(shell) {
    const codes = shell.hints.map(codeOf);
    return codes
        .filter((code, i) => codes.indexOf(code) < i)
        .map(code => declaration.issue(`${shell.name} has a second hint for the code ${code}`));
}
// A command no tool lists has no words yet, so the issue names what it does.
function afterIssues(shell) {
    const listed = runnersIn(shell.commands);
    return shell.next
        .flatMap(after => followsOf(after)?.commands ?? [])
        .map(command => runnerOf(command))
        .filter(runner => runner === undefined || listed.has(runner) === false)
        .map(runner => {
        const does = runner === undefined ? 'is no command' : runner.does;
        const message = `an after names a command that ${does}, and ${shell.name} does not list it`;
        return declaration.issue(message);
    });
}
