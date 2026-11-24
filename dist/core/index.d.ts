/**
 * What every feature of adx shares: the answer, its kinds and exit codes, issues and refusals.
 *
 * Answer, exitOf, refusalAnswer: the answer and the exit code it ends with.
 * Kind: who acts after a refusal.
 * Step, Path, Issue, withCommand: one issue of a refusal, its place, and the command it names.
 * Code, code: a code a tool declares and raises.
 * unknownCommand, unknownOption, schemaFailed, declaration, ...: codes adx raises itself.
 * Refused, refusedWith, NOTHING_CHANGED: the refusal of adx.
 * failed, answerOfError: any error as a refusal of adx, and as an answer.
 * status: the HTTP status of a failed send.
 * Token, Around, Ran: what one call gets and leaves.
 *
 * @example import { code, Refused } from '../core/index.ts';
 */
export type { Answer } from './answer.ts';
export { exitOf, refusalAnswer } from './answer.ts';
export type { Code } from './code.ts';
export { code } from './code.ts';
export { declaration, invalidJson, missingValue, notInList, optionBeforeCommand, repeatedOption, schemaFailed, unexpectedArgument, unexpectedValue, unknownCommand, unknownOption, } from './codes.ts';
export { answerOfError, failed } from './failed.ts';
export type { Path, Step } from './issue.ts';
export { Issue, withCommand } from './issue.ts';
export type { Kind } from './kind.ts';
export { NOTHING_CHANGED, Refused, refusedWith } from './refused.ts';
export { status } from './status.ts';
export type { Around, Ran, Token } from './types.ts';
