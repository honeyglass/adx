/**
 * The signs a POSIX shell, bash and zsh read as text outside quotes, anywhere in a word, and `=`
 * not first, which zsh expands to a program's path: an allow-list, so a sign not named, such as
 * `~`, `#`, `^`, `!` or a backslash, is quoted when adx writes it and refused when it reads it.
 */
export declare const BARE: RegExp;
/** @returns the words of the line, or undefined when the line is no plain call */
export declare function wordsOf(line: string): string[] | undefined;
