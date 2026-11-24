/**
 * The internal types of core/: what one call gets from its surroundings, and what it leaves.
 *
 * Token: one word of the arguments, as util.parseArgs reads it in its lenient mode.
 * Piped, Stdin, Around: what is piped in, its read, and the tokens, whether stdout is a terminal,
 * and stdin.
 * Ran: the exit code and what the call wrote to stdout and stderr; the test kit's run answers it.
 *
 * main() takes them from Node, and run() from its options, so both go through one call. Only
 * node/ reads the arguments with util.parseArgs; the call gets its tokens, and checks each itself.
 *
 * @example const ran = await call(spec, { tokens: tokensOf(['greet']), tty: false, stdin });
 */
import type { Exit } from './answer.ts';
/** An option without `=` has no value; the word after it, if any, is a positional of its own. */
export type Token = {
    kind: 'option';
    name: string;
    rawName: string;
    value?: string;
    inlineValue?: boolean;
} | {
    kind: 'positional';
    value: string;
} | {
    kind: 'option-terminator';
};
/**
 * The text piped in, cut one character past STDIN_LIMIT, so a longer one shows past the limit;
 * `utf8: false` for bytes that are no UTF-8; null when stdin is a terminal.
 */
export type Piped = {
    text: string;
} | {
    utf8: false;
} | null;
/** Read only for `--json -`, so a call that does not name stdin never waits on it. */
export type Stdin = () => Promise<Piped>;
export type Around = {
    readonly tokens: readonly Token[];
    readonly tty: boolean;
    readonly stdin: Stdin;
};
export interface Ran {
    readonly exit: Exit;
    /** What the call wrote to stdout. */
    readonly out: string;
    /** What the call wrote to stderr. */
    readonly err: string;
}
