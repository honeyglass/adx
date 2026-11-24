/**
 * A command a tool names, split into the words a shell would pass the program, by `unbash`.
 *
 * wordsOf: the words of one plain call, or undefined for a line that is no plain call.
 *
 * This is the one file that imports `unbash` (decision 3), so a swap touches this file only. A
 * plain call is one simple command, run in the foreground, whose words are text and quotes of
 * text and nothing else: no pipe, list, redirect, assignment, expansion, glob, brace, comment or
 * `~` that expands, and nothing before or after the command but spaces and tabs. The agent that
 * runs any other line word for word would run something else than one call of the tool. A line
 * whose words differ between common shells is no plain call either: one with a control character
 * outside quotes, or with a backslash at its end, which dash and bash 5 keep and bash 3.2 and zsh
 * drop.
 *
 * @example wordsOf("hello greet --name 'Ada O'\\''Hara'"); // ['hello', 'greet', '--name', "Ada O'Hara"]
 */
import { parse } from 'unbash';
/** The controls of ASCII but the tab, which parts words, and the line feed, which parts lines. */
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f]/;
/** An odd run of backslashes at the end: the last one escapes nothing. */
const TRAILING_BACKSLASH = /(?<!\\)(?:\\\\)*\\$/;
/** What may stand before and after the one command. */
const BLANK = /^[ \t]*$/;
/** @returns the words of the line, or undefined when the line is no plain call */
export function wordsOf(line) {
    const words = commandWords(line);
    if (words === undefined || TRAILING_BACKSLASH.test(line))
        return undefined;
    if (CONTROL.test(outsideQuotes(line, words)))
        return undefined;
    return words.map(word => word.value);
}
function commandWords(line) {
    const script = parse(line);
    const [statement, ...more] = script.commands;
    if (statement === undefined || more.length > 0)
        return undefined;
    if ((script.errors ?? []).length > 0 || statement.background === true)
        return undefined;
    // unbash drops a comment and a blank line, so only the text around the command shows them
    if (BLANK.test(line.slice(0, statement.pos) + line.slice(statement.end)) === false) {
        return undefined;
    }
    const { command } = statement;
    if (command.type !== 'Command' || command.name === undefined)
        return undefined;
    if (command.prefix.length > 0)
        return undefined;
    const words = [command.name, ...command.suffix];
    return words.every(isText) ? words : undefined;
}
// A tilde at the start of a word stands in its text unquoted, and the shell expands it.
function isText(word) {
    if (word.type !== 'Word' || word.text.startsWith('~'))
        return false;
    return (word.parts ?? []).every(isTextPart);
}
function isTextPart(part) {
    if (part.type === 'Literal' || part.type === 'SingleQuoted')
        return true;
    return part.type === 'DoubleQuoted' && part.parts.every(child => child.type === 'Literal');
}
// The characters of the line that stand in no quotes, by the code units unbash counts in.
function outsideQuotes(line, words) {
    const quoted = words.flatMap(word => (word.parts ?? []).filter(part => part.type !== 'Literal'));
    return [...line.split('').entries()]
        .filter(([at]) => quoted.every(part => at < part.pos || at >= part.end))
        .map(([, char]) => char)
        .join('');
}
