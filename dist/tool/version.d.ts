/**
 * --version: the tool called with it alone answers its version (decision 71).
 *
 * VERSION, namesVersion, versionAnswer: the option, whether a call is `tool --version`, and its
 * answer.
 *
 * The option belongs to the tool alone, so no command takes it, and a field may be named
 * `version`. With command words or another option beside it, the call is read as any other.
 *
 * @example if (namesVersion(tokens)) return versionAnswer(shell);
 */
import type { Answered } from '../command/index.ts';
import type { Token } from '../core/index.ts';
import type { Shell } from './tool.ts';
/** The name of the option, which no root may take either. */
export declare const VERSION = "version";
/** @returns whether the call is --version alone, without a value */
export declare function namesVersion(tokens: readonly Token[]): boolean;
/** @returns the version as the result, which a person at a terminal reads alone on its line */
export declare const versionAnswer: (shell: Shell) => Answered;
