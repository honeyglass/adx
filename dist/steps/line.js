/**
 * A call as one line of shell words, so an agent runs the command of a step word for word.
 *
 * lineOf: the words joined, each quoted where a shell would read it as more than text.
 * optionWords: the words of one option with its value.
 *
 * A word stays bare only when each of its characters stands in an allow-list that a POSIX shell
 * reads as plain text, and `=` does not open it, which zsh expands to a program's path. Any other
 * word goes in single quotes, inside which the shell reads every character as text; a single
 * quote in it ends the quotes, stands escaped, and opens them again.
 *
 * @example lineOf(['hello', 'greet', '--name', "Ada O'Hara"]); // hello greet --name 'Ada O'\''Hara'
 */
/** The characters a shell takes as text outside quotes: an allow-list, so a new sign is quoted. */
const BARE = /^[A-Za-z0-9_@%+:,./-][A-Za-z0-9_@%+=:,./-]*$/;
/** @returns the words as one line, each bare or in single quotes */
export const lineOf = (words) => words.map(quoted).join(' ');
const quoted = (word) => (BARE.test(word) ? word : `'${word.replaceAll("'", "'\\''")}'`);
/**
 * A value that starts with a dash would read as an option of its own, so it follows `=`.
 *
 * @param option - the name of the option, without its dashes
 * @param value - the value as text
 * @returns the option and its value, as one word or two
 */
export const optionWords = (option, value) => value.startsWith('-') ? [`--${option}=${value}`] : [`--${option}`, value];
