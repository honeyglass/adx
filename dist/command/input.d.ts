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
import type { Issue } from '../core/index.ts';
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
/**
 * @param spec - the spec of the command
 * @param global - the global input of the tool the command was made for, if any
 * @returns its own input, with each global field it takes, optional where it says so
 */
export declare function inputOf(spec: Spec, global: Obj | undefined): Obj;
/** @returns each field of the command's own input that the global input it takes also has */
export declare function sharedWithGlobal(spec: Spec, global: Obj | undefined): string[];
/** @returns each field of the schema in its order, with what its option takes */
export declare function fieldsOf(schema: Obj): FieldOf[];
/**
 * A field the schema does not name is refused, never dropped.
 *
 * @param schema - the input schema of the command
 * @param value - the input of the call
 * @returns the checked input, or the issues: first each unnamed field, then Zod's own
 */
export declare function parsedBy(schema: Obj, value: unknown): {
    data: Record<string, unknown>;
    issues: never[];
} | {
    data: null;
    issues: Issue<string>[];
};
/**
 * @param output - the schema of the answer of a read
 * @returns the fields of an object answer, or of each item of a list answer, with their texts
 */
export declare function answerFieldsOf(output: z.core.$ZodType): Choice[];
