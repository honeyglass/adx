/**
 * The steps of adx: what a success names next, and the command that helps with a refusal.
 *
 * tell, schema, hint, Hint: a step for the person, a step to `schema`, and a hint of the tool.
 * everySchema: the step to `schema` alone.
 * hintFor, codeOf: the step of the tool's hint for a code, and the code of a hint.
 * stepAnswer, NextStep, Context: a step written out for the call that answers it.
 *
 * @example import { hintFor, stepAnswer } from '../steps/index.ts';
 */
export { stepAnswer } from './answer.ts';
export type { Context, NextStep } from './answer.ts';
export { codeOf, hint, hintFor } from './hint.ts';
export type { Hint } from './hint.ts';
export { everySchema, schema } from './schema.ts';
export { tell } from './tell.ts';
