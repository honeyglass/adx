/**
 * What every feature of adx shares: the answer, its kinds and exit codes, issues and refusals.
 *
 * Answer, exitOf, refusalAnswer: the answer and the exit code it ends with.
 * Kind: who acts after a refusal.
 * Path, Issue, withCommand, withHint, stepOf: an issue, its place, command, hint and step.
 * Step, CommandStep, commandStep, Target, partsOfStep: a next move, and one to a command.
 * Code, code: a code a tool declares and raises.
 * unknownCommand, unknownOption, schemaFailed, declaration, ...: codes adx raises itself.
 * Refused, refusedWith, NOTHING_CHANGED, UNKNOWN_STATE: the refusal of adx, and what it left.
 * failed, refusedOf, answerOfError, answerOfRefused: any error as a refusal of adx, and as an
 * answer.
 * isDecimal, escaped, oneLine: the one form of a number, and text escaped for a terminal.
 * Choice, Source, Sources, ...: where the values of a field come from, and the port to them.
 * status: the HTTP status of a failed send.
 * Token, Around, Ran: what one call gets and leaves.
 *
 * @example import { code, Refused } from '../core/index.ts';
 */
export type { Answer } from './answer.ts';
export { exitOf, refusalAnswer } from './answer.ts';
export type { Code } from './code.ts';
export { code } from './code.ts';
export { declaration, invalidJson, missingValue, notInList, notInListAt, optionBeforeCommand, repeatedOption, schemaFailed, unexpectedArgument, unexpectedValue, unknownCommand, unknownOption, } from './codes.ts';
export { isDecimal } from './decimal.ts';
export { escaped, oneLine } from './escape.ts';
export { answerOfError, answerOfRefused, failed, refusedOf } from './failed.ts';
export type { Path } from './issue.ts';
export { Issue, stepOf, withCommand, withHint } from './issue.ts';
export type { Kind } from './kind.ts';
export { NOTHING_CHANGED, Refused, refusedWith, UNKNOWN_STATE } from './refused.ts';
export type { AnyList, Choice, Declared, Fresh, Known, Listed, ListRef, Needs, Source, Sourced, Sources, } from './source.ts';
export { freshBrand, needsBrand, refBrand } from './source.ts';
export { status } from './status.ts';
export type { CommandStep, Step, StepParts, Target, TargetField } from './step.ts';
export { commandStep, partsOfStep } from './step.ts';
export type { Around, Ran, Token } from './types.ts';
