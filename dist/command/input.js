/**
 * What adx reads of a command's Zod schemas: its fields as options, and its input checked.
 *
 * inputOf: the schema of a command with the global fields it takes.
 * sharedWithGlobal: the fields of a command the global input would replace.
 * fieldsOf, FieldOf, Takes: each field, the option it becomes and what that option takes.
 * parsedBy: the input checked against the schema, or one SCHEMA issue per problem, and one
 * NOT_IN_LIST issue per value an enum field does not list.
 * knownOf: the fields a call gave, checked, for a source that gets the input as far as known.
 * choicesOf: the values of an enum field, which lists them as a source does.
 * acceptsValue: whether one field of the schema takes a value, for a field a step carries.
 * answerFieldsOf: the fields of an answer that `output` declares, for --fields.
 *
 * This is the one file of command/ that calls Zod, so a change of Zod touches one file. It
 * translates what Zod says and decides nothing.
 *
 * @example const parsed = parsedBy(inputOf(spec, global), { name: 'Ada' });
 */
import { z } from 'zod';
import { notInListAt, schemaFailed } from "../core/index.js";
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
    const failed = parsed.success
        ? []
        : parsed.error.issues.flatMap(i => zodIssues(schema, i, value));
    return { data: null, issues: [...unnamed, ...failed] };
}
/**
 * Each field is checked by its own schema, so a rule across fields, which needs them all, waits
 * for the whole input. A field the schema does not name is left out: the call refuses it once
 * its schema runs.
 *
 * @param schema - the input schema of the command
 * @param given - the fields a call gave, or would hold
 * @returns the fields that pass their schema, checked, with the defaults of those left out, and
 * the issues of the fields that fail
 */
export function knownOf(schema, given) {
    const data = {};
    const issues = [];
    for (const [field, shape] of Object.entries(schema.shape)) {
        const present = Object.hasOwn(given, field);
        const parsed = z.safeParse(shape, present ? given[field] : undefined);
        if (parsed.success && parsed.data !== undefined)
            data[field] = parsed.data;
        if (parsed.success || present === false)
            continue;
        const placed = parsed.error.issues.map(issue => ({ ...issue, path: [field, ...issue.path] }));
        issues.push(...placed.flatMap(issue => zodIssues(schema, issue, given)));
    }
    return { data, issues };
}
/**
 * @param schema - the input schema of the command
 * @param field - a field the schema may not name
 * @returns the values of an enum field, or of a field that holds a list of an enum; else undefined
 */
export function choicesOf(schema, field) {
    const shape = Object.hasOwn(schema.shape, field) ? schema.shape[field] : undefined;
    if (shape === undefined)
        return undefined;
    const base = baseOf(shape);
    const item = base instanceof z.ZodArray ? baseOf(base.element) : base;
    if (item instanceof z.ZodEnum === false)
        return undefined;
    return item.options.map(option => ({ value: `${option}` }));
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
 * At the root, unnamedIssues already names them. A value an enum field does not list is a value
 * outside its list, as for a source of `values` (rule 13).
 */
function zodIssues(schema, issue, value) {
    const listed = listedPath(schema, issue.path);
    if (issue.code === 'invalid_value' && listed !== undefined) {
        return [notInListAt(listed, valueAt(value, listed))];
    }
    if (issue.code !== 'unrecognized_keys')
        return [schemaIssue(issue.path, issue.message)];
    if (issue.path.length === 0)
        return [];
    return issue.keys.map(key => schemaIssue([...issue.path, key], `the input has no field ${key}`));
}
// The path of an enum field, or of one value of a field that holds a list of an enum.
function listedPath(schema, path) {
    const [field, index, ...below] = path;
    if (typeof field !== 'string' || below.length > 0)
        return undefined;
    if (index !== undefined && typeof index !== 'number')
        return undefined;
    if (choicesOf(schema, field) === undefined)
        return undefined;
    return index === undefined ? [field] : [field, index];
}
function valueAt(value, path) {
    return path.reduce((part, key) => (typeof part === 'object' && part !== null ? Reflect.get(part, key) : undefined), value);
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
 * @param schema - the input schema of the command
 * @param field - the field, which the schema may not name
 * @param value - the value as a caller writes it
 * @returns true when the schema names the field and its schema takes the value
 */
export function acceptsValue(schema, field, value) {
    const shape = Object.hasOwn(schema.shape, field) ? schema.shape[field] : undefined;
    return shape !== undefined && z.safeParse(shape, value).success;
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
