/**
 * The steps of adx: what a success names next, and the command that helps with a refusal.
 *
 * tell, schema, hint, Hint: a step for the person, a step to `schema`, and a hint of the tool.
 * everySchema: the step to `schema` alone.
 * hintFor, codeOf, stepOfHint: the step of the tool's hint for a code, and the code and the step
 * of a hint.
 * schemaNameOf: the name a step to `schema` shows.
 * stepAnswer, NextStep, Context: a step written out for the call that answers it.
 * lineOf: words as one line a shell reads word for word.
 *
 * @example import { hintFor, stepAnswer } from '../steps/index.ts';
 */
export { stepAnswer } from './answer.ts';
export type { Context, NextStep } from './answer.ts';
export { codeOf, hint, hintFor, stepOfHint } from './hint.ts';
export type { Hint } from './hint.ts';
export { lineOf } from './line.ts';
export { everySchema, schema, schemaNameOf } from './schema.ts';
export { tell } from './tell.ts';
