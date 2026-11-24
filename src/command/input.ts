/**
 * What adx reads of a command's Zod schemas: its fields as options, and its input checked.
 *
 * inputOf: the schema of a command with the global fields it takes.
 * sharedWithGlobal: the fields of a command the global input would replace.
 * fieldsOf, FieldOf, Takes: each field, the option it becomes and what that option takes.
 * parsedBy: the input checked against the schema, or one SCHEMA issue per problem.
 * acceptsValue: whether one field of the schema takes a value, for a field a step carries.
 * answerFieldsOf: the fields of an answer that `output` declares, for --fields.
 *
 * This is the one file of command/ that calls Zod, so a change of Zod touches one file. It
 * translates what Zod says and decides nothing.
 *
 * @example const parsed = parsedBy(inputOf(spec, global), { name: 'Ada' });
 */
import { z } from 'zod';
import { schemaFailed } from '../core/index.ts';
import type { Issue, Path } from '../core/index.ts';
import type { Choice, Obj, Spec } from './types.ts';

/** What an option takes: no value, a text, a number read from its text, or nothing (--json only). */
export type Takes = 'switch' | 'text' | 'number' | 'json';

export type FieldOf = {
  field: string;
  takes: Takes;
  repeats: boolean;
  required: boolean;
  does?: string;
  default?: unknown;
};

const EMPTY = z.object({});

/**
 * @param spec - the spec of the command
 * @param global - the global input of the tool the command was made for, if any
 * @returns its own input, with each global field it takes, optional where it says so
 */
export function inputOf(spec: Spec, global: Obj | undefined): Obj {
  const own = spec.input ?? EMPTY;
  if (global === undefined || spec.global === false) return own;
  const shape = Object.entries(global.shape).map(([field, schema]) => {
    return [field, isOptionalIn(spec.global, field) ? z.optional(schema) : schema] as const;
  });
  return own.extend(Object.fromEntries(shape));
}

/** @returns each field of the command's own input that the global input it takes also has */
export function sharedWithGlobal(spec: Spec, global: Obj | undefined) {
  if (global === undefined || spec.global === false || spec.input === undefined) return [];
  return Object.keys(spec.input.shape).filter(field => Object.hasOwn(global.shape, field));
}

const isOptionalIn = (use: unknown, field: string) =>
  typeof use === 'object' &&
  use !== null &&
  Object.getOwnPropertyDescriptor(use, field)?.value === 'optional';

/** @returns each field of the schema in its order, with what its option takes */
export function fieldsOf(schema: Obj): FieldOf[] {
  return Object.entries(schema.shape).map(([field, value]) => fieldOf(field, value));
}

function fieldOf(field: string, schema: z.core.$ZodType): FieldOf {
  const layers = layersOf(schema);
  const does = layers.map(layer => z.globalRegistry.get(layer)?.description).find(Boolean);
  const defaulted = layers.find(layer => layer instanceof z.ZodDefault);
  return {
    field,
    ...optionOf(baseOf(schema)),
    // Zod marks a field that may be left out, by .optional() or a default, and none else.
    required: schema._zod.optin === undefined,
    ...(does === undefined ? {} : { does }),
    ...(defaulted === undefined ? {} : { default: defaulted.def.defaultValue }),
  };
}

// An array of texts or numbers takes its option again; any other array goes in through --json.
function optionOf(base: z.core.$ZodType): { takes: Takes; repeats: boolean } {
  if (base instanceof z.ZodArray === false) return { takes: takesOf(base), repeats: false };
  const takes = takesOf(baseOf(base.element));
  if (takes === 'text' || takes === 'number') return { takes, repeats: true };
  return { takes: 'json', repeats: false };
}

// The schema and every schema it wraps, the outermost first, down to the one that checks the value.
function layersOf(schema: z.core.$ZodType): z.core.$ZodType[] {
  const inner = innerOf(schema);
  return inner === undefined ? [schema] : [schema, ...layersOf(inner)];
}

const baseOf = (schema: z.core.$ZodType): z.core.$ZodType => {
  const inner = innerOf(schema);
  return inner === undefined ? schema : baseOf(inner);
};

function innerOf(schema: z.core.$ZodType) {
  if (
    schema instanceof z.ZodOptional ||
    schema instanceof z.ZodNullable ||
    schema instanceof z.ZodDefault ||
    schema instanceof z.ZodPrefault ||
    schema instanceof z.ZodCatch ||
    schema instanceof z.ZodReadonly ||
    schema instanceof z.ZodNonOptional
  ) {
    return schema.unwrap();
  }
  if (schema instanceof z.ZodPipe) return schema.in;
  return undefined;
}

// An allow-list: a type not named here, such as an object or a union, goes in through --json only.
function takesOf(base: z.core.$ZodType): Takes {
  switch (base._zod.def.type) {
    case 'boolean':
      return 'switch';
    case 'number':
      return 'number';
    case 'string':
    case 'enum':
    case 'literal':
    case 'template_literal':
      return 'text';
    default:
      return 'json';
  }
}

/**
 * A field the schema does not name is refused, never dropped.
 *
 * @param schema - the input schema of the command
 * @param value - the input of the call
 * @returns the checked input, or the issues: first each unnamed field, then Zod's own
 */
export function parsedBy(schema: Obj, value: unknown) {
  const parsed = schema.safeParse(value);
  const unnamed = unnamedIssues(schema, value);
  if (parsed.success && unnamed.length === 0) return { data: parsed.data, issues: [] };
  const failed = parsed.success ? [] : parsed.error.issues.flatMap(zodIssues);
  return { data: null, issues: [...unnamed, ...failed] };
}

function unnamedIssues(schema: Obj, value: unknown) {
  if (typeof value !== 'object' || value === null) return [];
  return Object.keys(value)
    .filter(key => Object.hasOwn(schema.shape, key) === false)
    .map(key => schemaFailed.at(key, `the input has no field ${key}`));
}

/**
 * A strict object names its unknown keys in one issue; each becomes an issue at its own path.
 * At the root, unnamedIssues already names them.
 */
function zodIssues(issue: z.core.$ZodIssue): Issue[] {
  if (issue.code !== 'unrecognized_keys') return [schemaIssue(issue.path, issue.message)];
  if (issue.path.length === 0) return [];
  return issue.keys.map(key => schemaIssue([...issue.path, key], `the input has no field ${key}`));
}

// An issue at the root of the input names no field, so it has no path.
function schemaIssue(path: readonly PropertyKey[], message: string): Issue {
  const [field, ...below] = path;
  if (typeof field !== 'string') return schemaFailed.issue(message);
  const parts: Path<string> = [field, ...below.filter(part => typeof part !== 'symbol')];
  return schemaFailed.at(parts, message);
}

/**
 * @param schema - the input schema of the command
 * @param field - the field, which the schema may not name
 * @param value - the value as a caller writes it
 * @returns true when the schema names the field and its schema takes the value
 */
export function acceptsValue(schema: Obj, field: string, value: unknown) {
  const shape = Object.hasOwn(schema.shape, field) ? schema.shape[field] : undefined;
  return shape !== undefined && z.safeParse(shape, value).success;
}

/**
 * @param output - the schema of the answer of a read
 * @returns the fields of an object answer, or of each item of a list answer, with their texts
 */
export function answerFieldsOf(output: z.core.$ZodType): Choice[] {
  const base = baseOf(output);
  const item = base instanceof z.ZodArray ? baseOf(base.element) : base;
  if (item instanceof z.ZodObject === false) return [];
  return fieldsOf(item).map(({ field, does }) => ({
    value: field,
    ...(does === undefined ? {} : { does }),
  }));
}
