/**
 * The answer a program wrote to stdout, checked against the answer shape of adx.
 *
 * answerIn: the answer, typed by its shape and the schema of its result.
 *
 * @example const { issues } = answerIn(ran.out, z.unknown());
 */
import assert from 'node:assert/strict';
import { z } from 'zod';
import { trySync$ } from '@honeyglass/utils/ts';
import { answerShape } from './answer.schema.ts';

/**
 * @param out - what the program wrote to stdout
 * @param result - the schema of the result, z.unknown() where the test reads none of it
 * @returns the answer; a test fails when stdout holds no JSON or no answer of this shape
 */
export function answerIn<R extends z.ZodType>(out: string, result: R) {
  const json = trySync$(() => JSON.parse(out));
  assert.equal(json.error, null, `stdout holds no JSON: ${out.slice(0, 200)}`);
  const answer = answerShape(result).safeParse(json.data);
  assert.ok(answer.success, `stdout holds no answer of adx: ${answer.error?.message}`);
  return answer.data;
}
