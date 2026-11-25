/**
 * What adx reads of a Zod schema in more than one feature: its layers, its parts, and its failures.
 *
 * layersOf, baseOf: a schema and each schema it wraps, and the innermost one, which checks the value.
 * schemasAlong: every schema a path passes inside a schema, for the shape a SCHEMA issue lies in.
 * Failure, failuresOf: one issue of a parse as the places and messages of SCHEMA issues.
 * unknownKeysIn: each key of a value that an object of the schema does not name.
 * unknownKindsIn: each place of a schema whose kind the walks cannot look into.
 * keysOf: the keys an object of the schema names, such as those of a stored format.
 * MULTILINE, brokenLinesIn: the mark of a string that may hold line breaks, and each plain string
 * of a value that holds a line break or another control character.
 * ID, isId: the check of id(), and whether a field's schema is one, for the start checks.
 *
 * The input check of a command and check() of a handler both answer SCHEMA, so both say it alike.
 * Zod drops a key an object does not name; adx refuses it, at any depth (rule 15). An object that
 * declares its other keys, loose or with a catchall, and a record keep them. A union takes the
 * first option that passes the value, a discriminated union the one its key names, a lazy schema
 * the one it makes, an intersection both sides, and a preprocess the schema after it, with the
 * value it makes. A kind of schema the walk cannot look into, such as a map or a custom check,
 * is a DECLARATION error, never let through: at startup for the schemas a tool declares, by
 * unknownKindsIn, and where a value reaches it, as the last line. A plain `z.string()` takes one
 * visible line, so adx refuses a line break or another control character in it, at any depth;
 * `multiline()` carries the mark that lets line breaks and tabs through. This is the one file of
 * core/ that calls Zod.
 *
 * @example const failures = [...unknownKeysIn(shape, value), ...parsed.error.issues.flatMap(failuresOf)];
 */
import { z } from 'zod';
import { declaration } from "./codes.js";
import { refusedWith, UNKNOWN_STATE } from "./refused.js";
/** @returns the schema and every schema it wraps, the outermost first */
export function layersOf(schema) {
    const inner = innerOf(schema);
    return inner === undefined ? [schema] : [schema, ...layersOf(inner)];
}
/** @returns the innermost schema, the one that checks the value */
export const baseOf = (schema) => {
    const inner = innerOf(schema);
    return inner === undefined ? schema : baseOf(inner);
};
// A preprocess checks with the schema after its function; any other pipe with the one before.
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
        return schema.in instanceof z.ZodTransform ? schema.out : schema.in;
    return undefined;
}
/**
 * @param root - the schema the path starts in, which is not among the answer
 * @param value - the value it checked
 * @param below - the keys and indexes inside it
 * @returns the schemas each part of the path passes, each with the schemas it wraps, and those
 * the root wraps; the walk ends at a part no schema can tell
 */
export function schemasAlong(root, value, below) {
    if (root instanceof z.ZodType === false)
        return [];
    let layers = layersAt(root, value);
    const along = layers.slice(1).map(({ schema }) => schema);
    for (const part of below) {
        const base = layers.at(-1);
        const child = base === undefined ? undefined : childOf(base.schema, part);
        if (base === undefined || child === undefined)
            break;
        layers = layersAt(child, valueIn(base.value, part));
        along.push(...layers.map(({ schema }) => schema));
    }
    return along;
}
/**
 * A strict object names its unknown keys in one issue; each becomes a failure at its own place.
 *
 * @param issue - one issue of a failed parse
 * @returns each place below the parsed value that failed, with its message
 */
export function failuresOf(issue) {
    const below = issue.path.filter(part => typeof part !== 'symbol');
    if (issue.code !== 'unrecognized_keys')
        return [{ below, message: issue.message }];
    return issue.keys.map(key => unknownKey([...below, key]));
}
/**
 * A strict object is left out: Zod refuses its unknown keys itself.
 *
 * @param schema - the schema of the value
 * @param value - the value as the caller gave it
 * @param below - the place of the value inside the one the walk began at
 * @returns one failure per key an object drops, at its place below the value
 * @throws a bug refusal, DECLARATION, for a kind of schema the walk does not know
 */
export function unknownKeysIn(schema, value, below = []) {
    const base = baseAt(schema, value, below);
    if (base.schema instanceof z.ZodIntersection) {
        return droppedByBoth(base.schema, base.value, below);
    }
    const entries = entriesOf(base.schema, base.value);
    return entries.flatMap(([part, item]) => {
        const child = childOf(base.schema, part);
        const at = [...below, part];
        if (child !== undefined)
            return unknownKeysIn(child, item, at);
        return base.schema instanceof z.ZodObject ? [unknownKey(at)] : [];
    });
}
/** @returns the keys the object the schema checks names; none for a schema of no object */
export function keysOf(schema) {
    const base = baseOf(schema);
    return base instanceof z.ZodObject ? Object.keys(base.shape) : [];
}
// The parts of a value its schema holds: the items of an array, the keys of an object.
function entriesOf(schema, value) {
    const listed = schema instanceof z.ZodArray || schema instanceof z.ZodTuple;
    if (listed && Array.isArray(value))
        return value.map((item, index) => [index, item]);
    const keyed = schema instanceof z.ZodObject || schema instanceof z.ZodRecord;
    return keyed && isRecord(value) ? Object.entries(value) : [];
}
/** A control character, or a line or paragraph separator: none shows on one line. */
const NOT_ONE_LINE = /[\p{Cc}\p{Zl}\p{Zp}]/u;
/** The line breaks and the tab that text of many lines holds. */
const LAYOUT = /[\n\r\t]/g;
/** The check multiline() carries: it lets line breaks and tabs through, and no other control. */
export const MULTILINE = z.refine((text) => /\p{Cc}/u.test(text.replace(LAYOUT, '')) === false, { error: 'the text holds a control character other than a line break or a tab' });
/** The check id() carries: an allow-list, since a character not named, such as `.` or `/`, can lead out of a folder. */
export const ID = z.regex(/^[A-Za-z0-9_-]+$/, {
    error: 'an id holds letters, digits, - and _ only',
});
/**
 * The check stays in the schema through .describe(), .optional() and further checks, and the walk
 * goes through every wrapper, the element of a list, each option of a union and a lazy schema,
 * so it marks the field however the author wrote it. A lazy schema that names itself ends.
 *
 * @returns whether the schema holds a string made by id() as its value, or as an item of it
 */
export function isId(schema, seen = new Set()) {
    const base = baseOf(schema);
    if (seen.has(base))
        return false;
    seen.add(base);
    if (base instanceof z.ZodString)
        return (base._zod.def.checks ?? []).includes(ID);
    if (base instanceof z.ZodArray)
        return isId(base.element, seen);
    if (base instanceof z.ZodUnion)
        return base.options.some(option => isId(option, seen));
    if (base instanceof z.ZodLazy)
        return isId(base.unwrap(), seen);
    return false;
}
/**
 * @param schema - the schema of the value
 * @param value - the value as the caller gave it
 * @param below - the place of the value inside the one the walk began at
 * @returns one failure per string of a plain z.string() that does not keep to one line
 * @throws a bug refusal, DECLARATION, for a kind of schema the walk does not know
 */
export function brokenLinesIn(schema, value, below = []) {
    const base = baseAt(schema, value, below);
    if (base.schema instanceof z.ZodIntersection) {
        const { left, right } = base.schema._zod.def;
        const failures = [left, right].flatMap(side => brokenLinesIn(side, base.value, below));
        return failures.filter((failure, i) => failures.findIndex(f => samePlace(f, failure)) === i);
    }
    if (typeof base.value === 'string') {
        const broken = isOneLine(base.schema) && NOT_ONE_LINE.test(base.value);
        return broken
            ? [
                {
                    below,
                    message: 'the field takes one line, and the value holds a line break or a control character',
                },
            ]
            : [];
    }
    return entriesOf(base.schema, base.value).flatMap(([part, item]) => {
        const child = childOf(base.schema, part);
        return child === undefined ? [] : brokenLinesIn(child, item, [...below, part]);
    });
}
/**
 * The kinds of schema the walks know: each one they look into, and each that holds no key Zod
 * would drop and no plain string. An allow-list, so a kind they cannot look into, such as a map,
 * a set or a custom check, is refused, never let through unchecked.
 */
const KNOWN = new Set([
    'object',
    'array',
    'tuple',
    'record',
    'union',
    'intersection',
    'string',
    'number',
    'bigint',
    'boolean',
    'date',
    'enum',
    'literal',
    'template_literal',
    'null',
    'undefined',
    'void',
    'never',
    'nan',
    'symbol',
    'file',
    'any',
    'unknown',
]);
/**
 * @returns the innermost layer the value passes
 * @throws a bug refusal, DECLARATION, for a kind of schema the walks do not know
 */
function baseAt(schema, value, below) {
    const base = layersAt(schema, value).at(-1) ?? { schema, value };
    const kind = base.schema._zod.def.type;
    if (KNOWN.has(kind))
        return base;
    const at = below.length === 0 ? 'the value' : below.join('.');
    const message = `the schema at ${at} is a ${kind}, which adx cannot check for unknown keys and line breaks`;
    // the last line behind the start check, such as in check() of a handler that may have sent
    throw refusedWith([declaration.issue(message)], UNKNOWN_STATE);
}
/**
 * The start check of the walks: the schema itself, so a kind they do not know shows before any
 * value reaches it. A schema that names itself is walked once.
 *
 * @returns each place of the schema whose kind the walks do not know, with the kind
 */
export function unknownKindsIn(schema, below = [], seen = new Set()) {
    if (seen.has(schema))
        return [];
    seen.add(schema);
    const inner = schema instanceof z.ZodLazy ? schema.unwrap() : innerOf(schema);
    if (inner !== undefined)
        return unknownKindsIn(inner, below, seen);
    const kind = schema._zod.def.type;
    if (KNOWN.has(kind) === false)
        return [{ below, kind }];
    return partsOf(schema).flatMap(([part, child]) => unknownKindsIn(child, part === undefined ? below : [...below, part], seen));
}
// Each schema a schema holds, by the key or index it stands at; `*` for any key or item, and no
// part for an option of a union or a side of an intersection, which stand at the same place.
function partsOf(schema) {
    if (schema instanceof z.ZodObject) {
        const { catchall } = schema._zod.def;
        const own = Object.entries(schema.shape);
        return catchall === undefined ? own : [...own, ['*', catchall]];
    }
    if (schema instanceof z.ZodArray)
        return [['*', schema.element]];
    if (schema instanceof z.ZodTuple) {
        const { items, rest } = schema._zod.def;
        const placed = items.map((item, i) => [i, item]);
        return rest === null || rest === undefined ? placed : [...placed, ['*', rest]];
    }
    if (schema instanceof z.ZodRecord)
        return [['*', schema.valueType]];
    if (schema instanceof z.ZodUnion)
        return schema.options.map(option => [undefined, option]);
    if (schema instanceof z.ZodIntersection) {
        return [
            [undefined, schema._zod.def.left],
            [undefined, schema._zod.def.right],
        ];
    }
    return [];
}
// Zod merges what both sides keep, so a key is dropped only when both drop it, or a key above it.
function droppedByBoth(both, value, below) {
    const byLeft = unknownKeysIn(both._zod.def.left, value, below);
    const byRight = unknownKeysIn(both._zod.def.right, value, below);
    const covered = (by, failure) => by.some(({ below: place }) => place.every((part, i) => part === failure.below[i]));
    const onlyRight = byRight.filter(failure => byLeft.some(f => samePlace(f, failure)) === false);
    return [
        ...byLeft.filter(failure => covered(byRight, failure)),
        ...onlyRight.filter(failure => covered(byLeft, failure)),
    ];
}
const samePlace = (one, other) => one.below.length === other.below.length && one.below.every((part, i) => part === other.below[i]);
const isOneLine = (schema) => schema instanceof z.ZodString && (schema._zod.def.checks ?? []).includes(MULTILINE) === false;
const unknownKey = (below) => ({
    below,
    message: `the input has no field ${below[below.length - 1]}`,
});
// The layers a value passes, outermost first: each wrapper, the option of a union it takes, and
// the schema after a preprocess, with the value the preprocess makes.
function layersAt(schema, value) {
    const inner = innerAt(schema, value);
    return inner === undefined
        ? [{ schema, value }]
        : [{ schema, value }, ...layersAt(inner.schema, inner.value)];
}
function innerAt(schema, value) {
    if (schema instanceof z.ZodLazy)
        return { schema: schema.unwrap(), value };
    if (schema instanceof z.ZodPipe && schema.in instanceof z.ZodTransform) {
        const made = z.safeParse(schema.in, value);
        return { schema: schema.out, value: made.success ? made.data : value };
    }
    if (schema instanceof z.ZodUnion) {
        const option = optionOf(schema, value);
        return option === undefined ? undefined : { schema: option, value };
    }
    const inner = innerOf(schema);
    return inner === undefined ? undefined : { schema: inner, value };
}
// A value that fails every option still names its option by the key of a discriminated union.
function optionOf(union, value) {
    const options = union.options;
    if (union instanceof z.ZodDiscriminatedUnion === false) {
        return options.find(option => z.safeParse(option, value).success);
    }
    const key = union._zod.def.discriminator;
    if (isRecord(value) === false)
        return undefined;
    return options.find(option => {
        const base = baseOf(option);
        const field = base instanceof z.ZodObject ? base.shape[key] : undefined;
        return field !== undefined && z.safeParse(field, value[key]).success;
    });
}
// An object's own field, else its catchall: never for a strict object, undefined for one that
// drops the key.
function childOf(schema, part) {
    if (schema instanceof z.ZodObject) {
        const own = typeof part === 'string' && Object.hasOwn(schema.shape, part);
        return own ? schema.shape[part] : schema._zod.def.catchall;
    }
    if (schema instanceof z.ZodArray)
        return schema.element;
    if (schema instanceof z.ZodTuple) {
        const items = schema._zod.def.items;
        return typeof part === 'number'
            ? (items[part] ?? schema._zod.def.rest ?? undefined)
            : undefined;
    }
    if (schema instanceof z.ZodRecord)
        return schema.valueType;
    return undefined;
}
const valueIn = (value, part) => Array.isArray(value) || isRecord(value) ? Reflect.get(value, part) : undefined;
const isRecord = (value) => typeof value === 'object' && value !== null && Array.isArray(value) === false;
