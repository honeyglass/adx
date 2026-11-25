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
type Part = string | number;
export type Failure = {
    below: Part[];
    message: string;
};
/** @returns the schema and every schema it wraps, the outermost first */
export declare function layersOf(schema: z.core.$ZodType): z.core.$ZodType[];
/** @returns the innermost schema, the one that checks the value */
export declare const baseOf: (schema: z.core.$ZodType) => z.core.$ZodType;
/**
 * @param root - the schema the path starts in, which is not among the answer
 * @param value - the value it checked
 * @param below - the keys and indexes inside it
 * @returns the schemas each part of the path passes, each with the schemas it wraps, and those
 * the root wraps; the walk ends at a part no schema can tell
 */
export declare function schemasAlong(root: object, value: unknown, below: readonly Part[]): object[];
/**
 * A strict object names its unknown keys in one issue; each becomes a failure at its own place.
 *
 * @param issue - one issue of a failed parse
 * @returns each place below the parsed value that failed, with its message
 */
export declare function failuresOf(issue: z.core.$ZodIssue): Failure[];
/**
 * A strict object is left out: Zod refuses its unknown keys itself.
 *
 * @param schema - the schema of the value
 * @param value - the value as the caller gave it
 * @param below - the place of the value inside the one the walk began at
 * @returns one failure per key an object drops, at its place below the value
 * @throws a bug refusal, DECLARATION, for a kind of schema the walk does not know
 */
export declare function unknownKeysIn(schema: z.core.$ZodType, value: unknown, below?: Part[]): Failure[];
/** @returns the keys the object the schema checks names; none for a schema of no object */
export declare function keysOf(schema: z.core.$ZodType): string[];
/** The check multiline() carries: it lets line breaks and tabs through, and no other control. */
export declare const MULTILINE: z.core.$ZodCheck<string>;
/** The check id() carries: an allow-list, since a character not named, such as `.` or `/`, can lead out of a folder. */
export declare const ID: z.core.$ZodCheckRegex;
/**
 * The check stays in the schema through .describe(), .optional() and further checks, and the walk
 * goes through every wrapper, the element of a list, each option of a union and a lazy schema,
 * so it marks the field however the author wrote it. A lazy schema that names itself ends.
 *
 * @returns whether the schema holds a string made by id() as its value, or as an item of it
 */
export declare function isId(schema: z.core.$ZodType, seen?: Set<z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>): boolean;
/**
 * @param schema - the schema of the value
 * @param value - the value as the caller gave it
 * @param below - the place of the value inside the one the walk began at
 * @returns one failure per string of a plain z.string() that does not keep to one line
 * @throws a bug refusal, DECLARATION, for a kind of schema the walk does not know
 */
export declare function brokenLinesIn(schema: z.core.$ZodType, value: unknown, below?: Part[]): Failure[];
/**
 * The start check of the walks: the schema itself, so a kind they do not know shows before any
 * value reaches it. A schema that names itself is walked once.
 *
 * @returns each place of the schema whose kind the walks do not know, with the kind
 */
export declare function unknownKindsIn(schema: z.core.$ZodType, below?: Part[], seen?: Set<z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>): {
    below: Part[];
    kind: string;
}[];
export {};
