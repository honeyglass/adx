/**
 * The input of a call that comes in whole with --json, beside the fields its options gave.
 *
 * withJson: one object of both, or an issue for a text that is no JSON object and for each field
 * both gave.
 *
 * Both fill the same object, so an agent can append --json to a command the tool proposed. A
 * field given twice is refused, never decided by order.
 *
 * @example const { input, issues } = withJson({ name: 'Ada' }, '{"lang":"de"}');
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { invalidJson, repeatedOption } from '../core/index.ts';
import type { Issue } from '../core/index.ts';

/**
 * @param given - the fields the options of the call gave
 * @param text - the value of --json
 * @returns the input of both, and the issues; JSON.parse defines each key as an own property,
 * so a key named __proto__ stays a field
 */
export function withJson(given: Record<string, unknown>, text: string) {
  const parsed = trySync$(() => JSON.parse(text));
  if (parsed.error !== null) {
    return refused(invalidJson.at('json', `--json holds no JSON: ${parsed.error.message}`));
  }
  const json: unknown = parsed.data;
  if (isRecord(json) === false)
    return refused(invalidJson.at('json', '--json holds no JSON object'));
  const twice = Object.keys(json).filter(key => Object.hasOwn(given, key));
  const issues = twice.map(key => repeatedOption.at(key, `${key} came as an option and in --json`));
  return { input: { ...given, ...json }, issues };
}

const refused = (issue: Issue) => ({ input: {}, issues: [issue] });

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;
