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

/** The signs sh reads as more than text anywhere outside quotes: a definition, from POSIX sh. */
const SHELL_SIGNS = /[|&;<>()$`*?[\n]/;

/** The signs sh reads as more than text at the start of a word: a comment and a tilde. */
const WORD_START = /[#~]/;

/** The characters a backslash escapes inside double quotes, per POSIX sh. */
const QUOTED_ESCAPES = /[$`"\\\n]/;

/** @returns the words of the line, or undefined when the line is no plain call */
export function wordsOf(line: string): string[] | undefined {
  const words: string[] = [];
  let word: string | undefined;
  let quote: "'" | '"' | undefined;
  for (let at = 0; at < line.length; at += 1) {
    const char = line[at] ?? '';
    const next = line[at + 1];
    if (quote === "'") {
      if (char === "'") quote = undefined;
      else word = `${word ?? ''}${char}`;
      continue;
    }
    if (quote === '"') {
      if (char === '"') quote = undefined;
      if (char === '$' || char === '`') return undefined;
      const escaped = char === '\\' && next !== undefined && QUOTED_ESCAPES.test(next);
      if (escaped) at += 1;
      if (escaped && next !== '\n') word = `${word ?? ''}${next}`;
      if (escaped === false && char !== '"') word = `${word ?? ''}${char}`;
      continue;
    }
    if (char === '\\') {
      if (next === undefined) return undefined;
      at += 1;
      if (next !== '\n') word = `${word ?? ''}${next}`;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      word = word ?? '';
      continue;
    }
    if (char === ' ' || char === '\t') {
      if (word !== undefined) words.push(word);
      word = undefined;
      continue;
    }
    if (SHELL_SIGNS.test(char)) return undefined;
    if (word === undefined && WORD_START.test(char)) return undefined;
    word = `${word ?? ''}${char}`;
  }
  if (quote !== undefined) return undefined;
  if (word !== undefined) words.push(word);
  return words;
}
