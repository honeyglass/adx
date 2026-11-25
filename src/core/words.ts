/**
 * A command a tool names, split into the words a shell would pass the program, by `unbash`.
 *
 * wordsOf: the words of one plain call, or undefined for a line that is no plain call.
 * BARE: the form of a word a shell reads as text outside quotes, which steps/line.ts writes bare.
 *
 * This is the one file that imports `unbash` (decision 3), so a swap touches this file only: the
 * test kit reads a command a tool names with it, and the answer checks a step written by hand. A
 * plain call is one simple command, run in the foreground, whose words are text and quotes of
 * text and nothing else: no pipe, list, redirect, assignment, expansion, glob, brace or comment,
 * outside quotes no sign but those adx writes bare, so neither a `~` nor zsh's `=` or `x#y`, and
 * nothing before or after the command but spaces and tabs. The agent that
 * runs any other line word for word would run something else than one call of the tool. A line
 * whose words differ between common shells is no plain call either: one with a control character
 * outside quotes, or with a backslash at its end, which dash and bash 5 keep and bash 3.2 and zsh
 * drop.
 *
 * @example wordsOf("hello greet --name 'Ada O'\\''Hara'"); // ['hello', 'greet', '--name', "Ada O'Hara"]
 */
import { parse } from 'unbash';
import type { CommandArgument, Redirection, Word, WordPart } from 'unbash';

/** The controls of ASCII but the tab, which parts words, and the line feed, which parts lines. */
const CONTROL = /[\x00-\x08\x0b-\x1f\x7f]/;

/** An odd run of backslashes at the end: the last one escapes nothing. */
const TRAILING_BACKSLASH = /(?<!\\)(?:\\\\)*\\$/;

/** What may stand before and after the one command. */
const BLANK = /^[ \t]*$/;

/**
 * The signs a POSIX shell, bash and zsh read as text outside quotes, anywhere in a word, and `=`
 * not first, which zsh expands to a program's path: an allow-list, so a sign not named, such as
 * `~`, `#`, `^`, `!` or a backslash, is quoted when adx writes it and refused when it reads it.
 */
export const BARE = /^[A-Za-z0-9_@%+:,./-][A-Za-z0-9_@%+=:,./-]*$/;

/** What a quoted part or sign reads as in a word, for BARE: text, whatever signs it holds. */
const QUOTED = 'q';

/** @returns the words of the line, or undefined when the line is no plain call */
export function wordsOf(line: string): string[] | undefined {
  const words = commandWords(line);
  if (words === undefined || TRAILING_BACKSLASH.test(line)) return undefined;
  if (CONTROL.test(outsideQuotes(line, words))) return undefined;
  return words.map(word => word.value);
}

function commandWords(line: string) {
  const script = parse(line);
  const [statement, ...more] = script.commands;
  if (statement === undefined || more.length > 0) return undefined;
  if ((script.errors ?? []).length > 0 || statement.background === true) return undefined;
  // unbash drops a comment and a blank line, so only the text around the command shows them
  if (BLANK.test(line.slice(0, statement.pos) + line.slice(statement.end)) === false) {
    return undefined;
  }
  const { command } = statement;
  if (command.type !== 'Command' || command.name === undefined) return undefined;
  if (command.prefix.length > 0) return undefined;
  const words = [command.name, ...command.suffix];
  return words.every(isText) ? words : undefined;
}

// Each sign outside quotes stands in the word's text as written, and the shell may expand it.
function isText(word: CommandArgument | Redirection): word is Word {
  if (word.type !== 'Word') return false;
  const parts = word.parts ?? [];
  const read =
    parts.length === 0
      ? escapedAsQuoted(word.text)
      : parts.map(part => (part.type === 'Literal' ? escapedAsQuoted(part.text) : QUOTED)).join('');
  return parts.every(isTextPart) && BARE.test(read);
}

// A backslash quotes the sign after it, as single and double quotes do (POSIX 2.2.1).
const escapedAsQuoted = (text: string) => text.replace(/\\[\s\S]/g, QUOTED);

function isTextPart(part: WordPart) {
  if (part.type === 'Literal' || part.type === 'SingleQuoted') return true;
  return part.type === 'DoubleQuoted' && part.parts.every(child => child.type === 'Literal');
}

// The characters of the line that stand in no quotes, by the code units unbash counts in.
function outsideQuotes(line: string, words: readonly Word[]) {
  const quoted = words.flatMap(word => (word.parts ?? []).filter(part => part.type !== 'Literal'));
  return [...line.split('').entries()]
    .filter(([at]) => quoted.every(part => at < part.pos || at >= part.end))
    .map(([, char]) => char)
    .join('');
}
