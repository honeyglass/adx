/**
 * What every feature of adx shares: the answer, its kinds and exit codes, issues and refusals.
 *
 * Answer, exitOf, refusalAnswer: the answer and the exit code it ends with.
 * Kind: who acts after a refusal.
 * Step, Path, Issue: one issue of a refusal, and its place.
 * Code, code: a code a tool declares and raises.
 * unknownCommand, schemaFailed, unexpectedArgument, missingValue: codes adx raises itself.
 * Refused, refusedWith, NOTHING_CHANGED: the refusal of adx.
 * failed, answerOfError: any error as a refusal of adx, and as an answer.
 * status: the HTTP status of a failed send.
 * Around, Ran: what one call gets and leaves.
 *
 * @example import { code, Refused } from '../core/index.ts';
 */
export type { Answer } from './answer.ts';
export { exitOf, refusalAnswer } from './answer.ts';
export type { Code } from './code.ts';
export { code } from './code.ts';
export { missingValue, schemaFailed, unexpectedArgument, unknownCommand } from './codes.ts';
export { answerOfError, failed } from './failed.ts';
export type { Path, Step } from './issue.ts';
export { Issue } from './issue.ts';
export type { Kind } from './kind.ts';
export { NOTHING_CHANGED, Refused, refusedWith } from './refused.ts';
export { status } from './status.ts';
export type { Around, Ran } from './types.ts';
