/**
 * The arguments of a call as tokens, read by Node's util.parseArgs in its lenient mode.
 *
 * tokensOf: one token per option, word and `--`, in their order.
 *
 * parseArgs declares no option here and decides nothing: strict is off, so it refuses no option,
 * and it pairs no option with the word after it. adx checks every token itself (decision 2).
 *
 * @example const tokens = tokensOf(['greet', '--name', 'Ada']);
 */
import { parseArgs } from 'node:util';
import type { Token } from '../core/index.ts';

/**
 * @param argv - the arguments after the program
 * @returns their tokens
 */
export function tokensOf(argv: readonly string[]): Token[] {
  return parseArgs({ args: [...argv], strict: false, tokens: true }).tokens;
}
