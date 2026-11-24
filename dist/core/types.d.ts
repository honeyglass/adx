/**
 * The internal types of core/: what one call gets from its surroundings, and what it leaves.
 *
 * Token: one word of the arguments, as util.parseArgs reads it in its lenient mode.
 * Around: the tokens, and whether stdout is a terminal.
 * Ran: the exit code and what the call wrote to stdout and stderr; the test kit's run answers it.
 *
 * main() takes them from Node, and run() from its options, so both go through one call. Only
 * node/ reads the arguments with util.parseArgs; the call gets its tokens, and checks each itself.
 *
 * @example const ran = await call(spec, { tokens: tokensOf(['greet', '--name', 'Ada']), tty: false });
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
export type Around = {
    readonly tokens: readonly Token[];
    readonly tty: boolean;
};
export interface Ran {
    readonly exit: Exit;
    /** What the call wrote to stdout. */
    readonly out: string;
    /** What the call wrote to stderr. */
    readonly err: string;
}
