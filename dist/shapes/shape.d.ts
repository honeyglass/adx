/**
 * What adx reads of a shape: the shapes of a tool, and a schema as JSON Schema.
 *
 * Shapes: the shapes a tool registers, each under the word that names it.
 * jsonSchemaOf: a Zod schema as JSON Schema, as a caller writes it or as an answer holds it.
 * bareSchemaOf: the same as an answer holds it, without descriptions and other metadata, so it
 * changes only with the fields, for the fingerprint of a stored format.
 *
 * This is the one file of shapes/ that calls Zod. A type JSON Schema cannot say, such as a date,
 * prints as `{}`, any value, so `schema` answers for every schema a tool declares.
 *
 * @example const shown = jsonSchemaOf(Person, 'input');
 */
import { z } from 'zod';
export type Shapes = {
    readonly [name: string]: z.ZodType;
};
/**
 * @param schema - the schema of an input, a shape or an answer
 * @param io - `input` for what a caller writes, so a field with a default is not required;
 * `output` for an answer
 * @returns the JSON Schema
 */
export declare const jsonSchemaOf: (schema: z.core.$ZodType, io: "input" | "output") => z.core.ZodStandardJSONSchemaPayload<z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
/** @param schema - the schema of a stored format */
export declare const bareSchemaOf: (schema: z.core.$ZodType) => z.core.ZodStandardJSONSchemaPayload<z.core.$ZodType<unknown, unknown, z.core.$ZodTypeInternals<unknown, unknown>>>;
