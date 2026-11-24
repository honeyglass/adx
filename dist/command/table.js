/**
 * The command table of a tool: where each command stands, and the setup the compiler cannot see.
 *
 * Table, isTable: a table of words, each a command or a nested table, a group.
 * isWord: whether a key is one word of a call, as a key of the table and of the tool's shapes.
 * placeAll: gives each command the words that call it, its tool's answer, and the sources of its
 * fields, when a tool lists it.
 * declarationIssues: one DECLARATION issue per mistake in the setup of the table.
 * runnersIn: every command the table lists, at any depth.
 *
 * tool() places its commands when its file loads and checks nothing; every call checks the
 * table first, so a mistake shows on the first run. A command that two places list, in one tool
 * or in two, has no one name, so its places are kept for that check.
 *
 * @example placeAll(spec.commands, spec.name);
 */
import { declaration } from "../core/index.js";
import { runnerOf } from "./command.js";
/**
 * A key is one word a shell passes as it is, and that util.parseArgs reads as a positional:
 * letters, digits and `-`, not first.
 */
const WORD = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
export const isWord = (key) => WORD.test(key);
/** A value of the table that is an object of objects, which a group is; a command is one too. */
export const isTable = (value) => Object.values(value).every(entry => typeof entry === 'object' && entry !== null);
/**
 * @param table - the command table, or a group of it
 * @param tool - the name of the tool that lists it, how it answers an invoke of a command, the
 * port to the sources of the fields, and the roots of the tool
 * @param words - the words of the group
 */
export function placeAll(table, tool, words = []) {
    for (const [word, entry] of Object.entries(table)) {
        const runner = runnerOf(entry);
        const { through, sources, roots } = tool;
        const place = { tool: tool.name, words: [...words, word].join(' '), through, sources, roots };
        if (runner !== undefined)
            runner.places.push(place);
        else if (isTable(entry))
            placeAll(entry, tool, [...words, word]);
    }
}
/** @returns the issues of the keys, of commands listed in more than one place, and of fields */
export function declarationIssues(table) {
    return [...keyIssues(table, []), ...[...runnersIn(table)].flatMap(runnerIssues)];
}
/** @returns the runner of every command the table lists, at any depth, each once */
export function runnersIn(table) {
    const runners = Object.values(table).flatMap(entry => {
        const runner = runnerOf(entry);
        if (runner !== undefined)
            return [runner];
        return isTable(entry) ? [...runnersIn(entry)] : [];
    });
    return new Set(runners);
}
function keyIssues(table, words) {
    return Object.entries(table).flatMap(([word, entry]) => {
        const issues = isWord(word) ? [] : [badKey(word, words)];
        if (runnerOf(entry) === undefined && isTable(entry))
            issues.push(...keyIssues(entry, [...words, word]));
        return issues;
    });
}
function badKey(word, words) {
    const where = words.length === 0 ? 'the table' : `the group ${words.join(' ')}`;
    const message = `the key ${JSON.stringify(word)} of ${where} is no word of letters, digits and -`;
    return declaration.issue(message);
}
function runnerIssues(runner) {
    const places = runner.places.map(({ tool, words }) => `${tool} ${words}`);
    if (places.length < 2)
        return runner.clashes();
    const twice = declaration.issue(`one command stands at ${places.join(' and at ')}`);
    return [twice, ...runner.clashes()];
}
