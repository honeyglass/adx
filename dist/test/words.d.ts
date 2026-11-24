/**
 * A command a tool names, split into the words a POSIX shell would pass the program.
 *
 * wordsOf: the words of one plain call, or undefined for a line that is no plain call.
 *
 * This is the one place that reads a named command; decision 3 names `unbash` for it, which is
 * no dependency of adx yet, so a swap touches this function only. It reads as sh does: single
 * quotes keep every character; inside double quotes a backslash escapes only `$`, a backtick,
 * `"`, `\` and a line break; outside quotes it escapes any character, and with a line break both
 * go. A line with an unquoted sign that makes the shell do more than pass text, such as a pipe,
 * `$`, a glob, a redirect, a comment or a `~` that expands, is no plain call: the agent that runs
 * it word for word would run something else than one call of the tool.
 *
 * @example wordsOf("hello greet --name 'Ada O'\\''Hara'"); // ['hello', 'greet', '--name', "Ada O'Hara"]
 */
/** @returns the words of the line, or undefined when the line is no plain call */
export declare function wordsOf(line: string): string[] | undefined;
