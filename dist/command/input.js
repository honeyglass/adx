/**
 * What adx reads of a command's Zod schemas: its fields as options, and its input checked.
 *
 * inputOf: the schema of a command with the global fields it takes.
 * sharedWithGlobal: the fields of a command the global input would replace.
 * fieldsOf, FieldOf, Takes: each field, the option it becomes and what that option takes.
 * parsedBy: the input checked against the schema, or one SCHEMA issue per problem.
 * answerFieldsOf: the fields of an answer that `output` declares, for --fields.
 *
 * This is the one file of command/ that calls Zod, so a change of Zod touches one file. It
 * translates what Zod says and decides nothing.
 *
 * @example const parsed = parsedBy(inputOf(spec, global), { name: 'Ada' });
 */
import { z } from 'zod';
import { schemaFailed } from "../core/index.js";
const EMPTY = z.object({});
/**
 * @param spec - the spec of the command
 * @param global - the global input of the tool the command was made for, if any
 * @returns its own input, with each global field it takes, optional where it says so
 */
export function inputOf(spec, global) {
    const own = spec.input ?? EMPTY;
    if (global === undefined || spec.global === false)
        return own;
    const shape = Object.entries(global.shape).map(([field, schema]) => {
        return [field, isOptionalIn(spec.global, field) ? z.optional(schema) : schema];
    });
    return own.extend(Object.fromEntries(shape));
}
/** @returns each field of the command's own input that the global input it takes also has */
export function sharedWithGlobal(spec, global) {
    if (global === undefined || spec.global === false || spec.input === undefined)
        return [];
    return Object.keys(spec.input.shape).filter(field => Object.hasOwn(global.shape, field));
}
const isOptionalIn = (use, field) => typeof use === 'object' &&
    use !== null &&
    Object.getOwnPropertyDescriptor(use, field)?.value === 'optional';
/** @returns each field of the schema in its order, with what its option takes */
export function fieldsOf(schema) {
    return Object.entries(schema.shape).map(([field, value]) => fieldOf(field, value));
}
function fieldOf(field, schema) {
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
function optionOf(base) {
    if (base instanceof z.ZodArray === false)
        return { takes: takesOf(base), repeats: false };
    const takes = takesOf(baseOf(base.element));
    if (takes === 'text' || takes === 'number')
        return { takes, repeats: true };
    return { takes: 'json', repeats: false };
}
// The schema and every schema it wraps, the outermost first, down to the one that checks the value.
function layersOf(schema) {
    const inner = innerOf(schema);
    return inner === undefined ? [schema] : [schema, ...layersOf(inner)];
}
const baseOf = (schema) => {
    const inner = innerOf(schema);
    return inner === undefined ? schema : baseOf(inner);
};
function innerOf(schema) {
    if (schema instanceof z.ZodOptional ||
        schema instanceof z.ZodNullable ||
        schema instanceof z.ZodDefault ||
        schema instanceof z.ZodPrefault ||
        schema instanceof z.ZodCatch ||
        schema instanceof z.ZodReadonly ||
        schema instanceof z.ZodNonOptional) {
        return schema.unwrap();
    }
    if (schema instanceof z.ZodPipe)
        return schema.in;
    return undefined;
}
// An allow-list: a type not named here, such as an object or a union, goes in through --json only.
function takesOf(base) {
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
export function parsedBy(schema, value) {
    const parsed = schema.safeParse(value);
    const unnamed = unnamedIssues(schema, value);
    if (parsed.success && unnamed.length === 0)
        return { data: parsed.data, issues: [] };
    const failed = parsed.success ? [] : parsed.error.issues.flatMap(zodIssues);
    return { data: null, issues: [...unnamed, ...failed] };
}
function unnamedIssues(schema, value) {
    if (typeof value !== 'object' || value === null)
        return [];
    return Object.keys(value)
        .filter(key => Object.hasOwn(schema.shape, key) === false)
        .map(key => schemaFailed.at(key, `the input has no field ${key}`));
}
/**
 * A strict object names its unknown keys in one issue; each becomes an issue at its own path.
 * At the root, unnamedIssues already names them.
 */
function zodIssues(issue) {
    if (issue.code !== 'unrecognized_keys')
        return [schemaIssue(issue.path, issue.message)];
    if (issue.path.length === 0)
        return [];
    return issue.keys.map(key => schemaIssue([...issue.path, key], `the input has no field ${key}`));
}
// An issue at the root of the input names no field, so it has no path.
function schemaIssue(path, message) {
    const [field, ...below] = path;
    if (typeof field !== 'string')
        return schemaFailed.issue(message);
    const parts = [field, ...below.filter(part => typeof part !== 'symbol')];
    return schemaFailed.at(parts, message);
}
/**
 * @param output - the schema of the answer of a read
 * @returns the fields of an object answer, or of each item of a list answer, with their texts
 */
export function answerFieldsOf(output) {
    const base = baseOf(output);
    const item = base instanceof z.ZodArray ? baseOf(base.element) : base;
    if (item instanceof z.ZodObject === false)
        return [];
    return fieldsOf(item).map(({ field, does }) => ({
        value: field,
        ...(does === undefined ? {} : { does }),
    }));
}
