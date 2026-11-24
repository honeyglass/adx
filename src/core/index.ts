/**
 * What every feature of adx shares: the answer, its kinds and exit codes, issues and refusals.
 *
 * Answer, exitOf, refusalAnswer: the answer and the exit code it ends with.
 * Kind: who acts after a refusal.
 * Path, Issue, withCommand, withHint, stepOf: an issue, its place, command, hint and step.
 * SchemaPlace, placed, placeOf: where a SCHEMA issue stands in the schema that failed.
 * layersOf, baseOf, schemasAlong, failuresOf, unknownKeysIn: a Zod schema's layers and parts,
 * the failures of a parse, and the keys an object would drop.
 * codePointsIn: the length of a text in characters.
 * Step, CommandStep, commandStep, Target, partsOfStep: a next move, and one to a command.
 * Code, code, factsOf: a code a tool declares and raises, and its name, kind and hint.
 * unknownCommand, unknownOption, schemaFailed, declaration, ...: codes adx raises itself, and
 * ADX_CODES, all of them.
 * Refused, refusedWith, NOTHING_CHANGED, UNKNOWN_STATE: the refusal of adx, and what it left.
 * failed, refusedOf, answerOfError, answerOfRefused: any error as a refusal of adx, and as an
 * answer.
 * isDecimal, escaped, oneLine: the one form of a number, and text escaped for a terminal.
 * Choice, Source, Sources, ...: where the values of a field come from, and the port to them.
 * status: the HTTP status of a failed send.
 * Token, Piped, Stdin, Around, Ran: what one call gets and leaves.
 * STDIN_LIMIT: how many characters of stdin `--json -` takes.
 *
 * @example import { code, Refused } from '../core/index.ts';
 */
export type { Answer } from './answer.ts';
export { exitOf, refusalAnswer } from './answer.ts';
export type { Code } from './code.ts';
export { code, factsOf } from './code.ts';
export {
  ADX_CODES,
  declaration,
  inputTooLarge,
  invalidJson,
  missingInput,
  missingValue,
  notInList,
  notInListAt,
  optionBeforeCommand,
  repeatedOption,
  schemaFailed,
  systemRefused,
  unexpectedArgument,
  unexpectedValue,
  unknownCommand,
  unknownOption,
} from './codes.ts';
export { isDecimal } from './decimal.ts';
export { escaped, oneLine } from './escape.ts';
export { codePointsIn } from './length.ts';
export { answerOfError, answerOfRefused, failed, refusedOf } from './failed.ts';
export type { Path, SchemaPlace } from './issue.ts';
export { Issue, placed, placeOf, stepOf, withCommand, withHint } from './issue.ts';
export type { Kind } from './kind.ts';
export { STDIN_LIMIT } from './limits.ts';
export { NOTHING_CHANGED, Refused, refusedWith, UNKNOWN_STATE } from './refused.ts';
export type { Failure } from './shape.ts';
export { baseOf, failuresOf, layersOf, schemasAlong, unknownKeysIn } from './shape.ts';
export type {
  AnyList,
  Choice,
  Declared,
  Fresh,
  Known,
  Listed,
  ListRef,
  Needs,
  Source,
  Sourced,
  Sources,
} from './source.ts';
export { freshBrand, needsBrand, refBrand } from './source.ts';
export { status } from './status.ts';
export type { CommandStep, Step, StepParts, Target, TargetField } from './step.ts';
export { commandStep, partsOfStep } from './step.ts';
export type { Around, Piped, Ran, Stdin, Token } from './types.ts';
