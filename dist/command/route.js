/**
 * The command words of a call, walked through the command table of its tool.
 *
 * Routed, route: the command the words name with the tokens after them, a group they end at,
 * or the word the table does not hold.
 * listed: the answer of a group called alone: every command below it.
 * commandsIn: every command below a table, with its words and what it does.
 *
 * Command words come first, options after. An option before the command words is refused, and
 * reading goes on, so the answer also names the mistakes after it.
 *
 * @example const routed = route(spec.commands, tokens, spec.name);
 */
import { optionBeforeCommand, unknownCommand } from "../core/index.js";
import { runnerOf } from "./command.js";
import { isTable } from "./table.js";
/** Two spaces between the longest command and what it does. */
const GAP = 2;
/**
 * @param root - the command table of the tool
 * @param tokens - every token of the call
 * @param tool - the name of the tool, the first word of every command it names
 * @returns the command with the tokens after it and the issues before it, the group the words
 * end at, or the issues when there is no command; such a list holds at least one
 */
export function route(root, tokens, tool) {
    const before = [];
    const words = [];
    let table = root;
    for (const [index, token] of tokens.entries()) {
        if (token.kind !== 'positional') {
            before.push({ token, place: [tool, ...words].join(' ') });
            continue;
        }
        // A key the table holds as its own, so a word such as toString finds no command.
        const entry = Object.hasOwn(table, token.value) ? table[token.value] : undefined;
        const runner = entry === undefined ? undefined : runnerOf(entry);
        if (runner !== undefined) {
            const rest = tokens.slice(index + 1);
            return { found: 'command', runner, rest, before: before.map(beforeCommand) };
        }
        if (entry === undefined || isTable(entry) === false) {
            const issues = [...before.map(beforeCommand), unknownWord(tool, words, token.value)];
            return { found: 'nothing', issues };
        }
        words.push(token.value);
        table = entry;
    }
    if (before.length > 0)
        return { found: 'nothing', issues: before.map(withoutCommand) };
    return { found: 'group', words, table };
}
const rawOf = (token) => (token.kind === 'option' ? token.rawName : '--');
const pathOf = (token) => (token.kind === 'option' ? token.name : '--');
// Before a command, the issue gets the call that shows what the command takes, as every issue
// of its arguments does.
const beforeCommand = ({ token }) => optionBeforeCommand.at(pathOf(token), `${rawOf(token)} stands before the command`);
// With no command, the issue names the call that lists the commands of the level it stood at.
const withoutCommand = ({ token, place }) => optionBeforeCommand
    .at(pathOf(token), `${rawOf(token)} needs a command, and ${place} names none`)
    .command({ does: 'lists the commands', command: place });
function unknownWord(tool, words, word) {
    const place = [tool, ...words].join(' ');
    return unknownCommand
        .issue(`${place} has no command ${word}`)
        .command({ does: 'lists the commands', command: place });
}
/**
 * @param table - the table of the group, the whole table for the tool alone
 * @param words - the words of the group, the tool's name first
 * @returns every command below the group, each with its words and what it does
 */
export function listed(table, words) {
    const commands = commandsIn(table, words);
    const width = Math.max(0, ...commands.map(({ command }) => command.length)) + GAP;
    const text = () => commands.map(({ command, does }) => `${command.padEnd(width)}${does}\n`).join('');
    return { answer: { ok: true, result: { commands } }, text };
}
/**
 * @param table - the table of a group, or of the tool
 * @param words - the words before the table's own
 * @returns each command below it, in the order of the table
 */
export function commandsIn(table, words) {
    return Object.entries(table).flatMap(([word, entry]) => {
        const runner = runnerOf(entry);
        if (runner !== undefined)
            return [{ command: [...words, word].join(' '), does: runner.spec.does }];
        return isTable(entry) ? commandsIn(entry, [...words, word]) : [];
    });
}
