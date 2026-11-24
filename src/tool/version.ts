/**
 * --version: the tool called with it alone answers its version (decision 71).
 *
 * namesVersion, versionAnswer: whether a call is `tool --version`, and its answer.
 *
 * The option belongs to the tool alone, so no command takes it, and a field may be named
 * `version`. With command words or another option beside it, the call is read as any other.
 *
 * @example if (namesVersion(tokens)) return versionAnswer(shell);
 */
import type { Answered } from '../command/index.ts';
import type { Token } from '../core/index.ts';
import type { Shell } from './tool.ts';

/** @returns whether the call is --version alone, without a value */
export function namesVersion(tokens: readonly Token[]) {
  const [token, ...more] = tokens;
  return (
    more.length === 0 &&
    token?.kind === 'option' &&
    token.name === 'version' &&
    token.inlineValue !== true
  );
}

/** @returns the version as the result, which a person at a terminal reads alone on its line */
export const versionAnswer = (shell: Shell): Answered => ({
  answer: { ok: true, result: shell.version },
});
