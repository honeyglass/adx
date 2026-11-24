/**
 * A step as the answer writes it: what it does, its command line, and the fields it still needs.
 *
 * NextStep, Context, stepAnswer: the step in the answer, the call that answers it, and the step
 * written out for that call.
 *
 * A step to a command carries the fields it gives, the global fields of the call that the
 * command takes, and each field it carries when the command would take the call's value. The
 * global fields stand first, then the command's own in the order of its schema, then what only
 * --json takes, then each folder the call moved (decision 13); a listed field comes after them,
 * alone, with no value, so the call lists its values, and the switches of adx come last. `needs`
 * names each required field the line leaves open, and each the step names, but never a listed one.
 *
 * @example const next = await stepAnswer(greet.step(), { tool: 'hello', input, folders: [] });
 */
import { declaration, isDecimal, partsOfStep, refusedWith, UNKNOWN_STATE } from '../core/index.ts';
import type { Step, StepParts, TargetField } from '../core/index.ts';
import { lineOf, optionWords } from './line.ts';
import { schemaNameOf } from './schema.ts';

export type NextStep = { does: string; command?: string; needs?: string[] };

/**
 * `tool` names the tool that answers; `input` is the input of the call as its caller gave it;
 * `folders` holds each root the call moved, by its option, so a named command lands there too.
 */
export type Context = {
  tool: string;
  input: Readonly<Record<string, unknown>>;
  folders: readonly { option: string; folder: string }[];
};

/**
 * @param step - a step a command, a hint or the tool named
 * @param context - the call that answers it
 * @returns the step as the answer writes it; a step from tell has no command
 * @throws a bug refusal, DECLARATION, for a step to a command that no tool lists
 */
export async function stepAnswer(step: Step, context: Context): Promise<NextStep> {
  const parts = partsOfStep(step);
  if (parts !== undefined) return commandAnswer(parts, context);
  const name = schemaNameOf(step);
  if (name !== undefined) {
    const words = name === '' ? [] : name.split(' ');
    return { does: step.does, command: lineOf([context.tool, 'schema', ...words]) };
  }
  return step.command === undefined
    ? { does: step.does }
    : { does: step.does, command: step.command };
}

async function commandAnswer(parts: StepParts, context: Context): Promise<NextStep> {
  const { target } = parts;
  if (target.call === undefined) {
    const message = `a step names the command that ${target.does}, and no tool lists it`;
    throw refusedWith([declaration.issue(message)], UNKNOWN_STATE);
  }
  const all = target.fields();
  const fields = [
    ...all.filter(field => field.global),
    ...all.filter(field => field.global === false),
  ];
  const values = await valuesOf(parts, fields, context);
  const listed = fields.find(field => field.field === parts.listed);
  const words = [
    ...target.call,
    ...optionsOf(fields, values),
    ...context.folders.flatMap(({ option, folder }) => optionWords(option, folder)),
    ...(listed?.option === undefined ? [] : [`--${listed.option}`]),
    ...parts.switches.map(name => `--${name}`),
  ];
  const needs = fields
    .filter(field => field.required || parts.needed.includes(field.field))
    .filter(field => values.has(field.field) === false && field !== listed)
    .map(field => field.field);
  return { does: target.does, command: lineOf(words), ...(needs.length > 0 ? { needs } : {}) };
}

async function valuesOf(parts: StepParts, fields: readonly TargetField[], context: Context) {
  const values = new Map<string, unknown>();
  const beside = besideOf(parts, fields, context);
  for (const { field, global } of fields) {
    // A listed field stands alone, so the call lists its values: it takes no value.
    if (field === parts.listed) continue;
    const value = await valueOf(parts, field, global, context, beside);
    if (value !== undefined) values.set(field, value);
  }
  return values;
}

// The step's own value wins. A global field comes from the call; a carried one only when the
// command would take the value in a real call (decision 79), else it stays out.
async function valueOf(
  parts: StepParts,
  field: string,
  global: boolean,
  context: Context,
  beside: Readonly<Record<string, unknown>>,
) {
  const own = valueIn(parts.given, field);
  if (own !== undefined) return own;
  const called = valueIn(context.input, field);
  if (called === undefined || global) return called;
  const carried = parts.carried.includes(field);
  if (carried && (await parts.target.accepts(field, called, beside))) return called;
  return undefined;
}

// What a real call of the step could hold beside a carried value, for the source that decides
// it: the step's own fields, and the fields of the call it takes as global or carried ones.
function besideOf(parts: StepParts, fields: readonly TargetField[], context: Context) {
  const beside: Record<string, unknown> = {};
  for (const { field, global } of fields) {
    const takes = global || parts.carried.includes(field);
    const value =
      valueIn(parts.given, field) ?? (takes ? valueIn(context.input, field) : undefined);
    if (value !== undefined) beside[field] = value;
  }
  return beside;
}

const valueIn = (record: Readonly<Record<string, unknown>>, field: string) =>
  Object.hasOwn(record, field) ? record[field] : undefined;

// A value no option can write, such as false or an object, goes into one --json after them.
function optionsOf(fields: readonly TargetField[], values: ReadonlyMap<string, unknown>) {
  const given = fields
    .filter(field => values.has(field.field))
    .map(field => ({
      field: field.field,
      value: values.get(field.field),
      words: wordsOf(field, values.get(field.field)),
    }));
  const options = given.flatMap(({ words }) => words ?? []);
  const rest = given.filter(({ words }) => words === undefined);
  if (rest.length === 0) return options;
  const json = Object.fromEntries(rest.map(({ field, value }) => [field, value]));
  return [...options, '--json', JSON.stringify(json)];
}

// A switch is true or absent; an array field takes its option once per text or number.
function wordsOf(field: TargetField, value: unknown) {
  const option = field.option;
  if (option === undefined) return undefined;
  if (field.switch) return value === true ? [`--${option}`] : undefined;
  if (field.repeats && Array.isArray(value) && value.length > 0 && value.every(isWord)) {
    return value.flatMap(item => optionWords(option, `${item}`));
  }
  return isWord(value) ? optionWords(option, `${value}`) : undefined;
}

// A number argv would not read as one, such as 1e21, goes into --json, which keeps it a number.
const isWord = (value: unknown): value is string | number =>
  typeof value === 'string' || (typeof value === 'number' && isDecimal(`${value}`));
