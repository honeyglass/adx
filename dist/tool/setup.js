/**
 * The setup of a tool that the compiler cannot see, checked at the start of every call.
 *
 * setupIssues: one DECLARATION issue per mistake: in the command table, per command an `after`
 * names that the tool does not list, per code that has a second hint, per shape that is no
 * word or has the word of a command, per list whose pages or one-item command do not fit, per
 * effect with `apply` and no `look`, and per remote whose own address or token cannot work.
 *
 * A remote the tool does not list shows only at its first request: a remote is a value of the
 * author's files, and nothing tells which of them a command reads before it runs.
 *
 * @example const [wrong, ...more] = setupIssues(shell, around.network);
 */
import { declarationIssues, followsOf, isWord, runnerOf, runnersIn } from "../command/index.js";
import { declaration } from "../core/index.js";
import { setupIssuesOf } from "../remote/index.js";
import { codeOf } from "../steps/index.js";
import { detailsOf } from "./detail.js";
/**
 * @param shell - what the call reads of the tool
 * @param network - the parser of the call, which reads each address as its requests would
 */
export function setupIssues(shell, network) {
    return [
        ...declarationIssues(shell.commands),
        ...afterIssues(shell),
        ...hintIssues(shell),
        ...shapeIssues(shell),
        ...listIssues(shell),
        ...lookIssues(shell),
        ...shell.remotes.flatMap(remote => setupIssuesOf(remote, network)),
    ];
}
// After a failed send only the look can show what the call left.
function lookIssues(shell) {
    return [...runnersIn(shell.commands)]
        .filter(runner => runner.spec.apply !== undefined && runner.spec.look === undefined)
        .map(runner => declaration.issue(`${shell.name} ${runner.name} has apply and no look, the call that shows what it left`));
}
// A page of no whole number of items never ends. An outline that hides a field needs the one
// command that shows an item in full, and two such commands leave the step after a page to the
// order of the table.
function listIssues(shell) {
    const lists = [...runnersIn(shell.commands)].filter(runner => runner.kind === 'list');
    return lists.flatMap(list => {
        const name = `${shell.name} ${list.name}`;
        const size = list.pageSize();
        const sized = Number.isSafeInteger(size) && size > 0;
        const details = detailsOf(shell, list).map(({ target }) => `${shell.name} ${target.name}`);
        const hidden = list.hidden().join(', ');
        return [
            ...(sized ? [] : [`${name} has the page size ${size}, and a page holds 1 item or more`]),
            ...(details.length > 1 ? [`${details.join(' and ')} each show one item of ${name}`] : []),
            ...(details.length === 0 && hidden !== ''
                ? [`${name} hides ${hidden} in its outline, and no detailOf of it names a command`]
                : []),
        ].map(message => declaration.issue(message));
    });
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
