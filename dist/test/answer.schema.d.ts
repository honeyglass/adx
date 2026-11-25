import { z } from 'zod';
export declare const Answer: z.ZodObject<{
    ok: z.ZodBoolean;
    applied: z.ZodOptional<z.ZodBoolean>;
    kind: z.ZodOptional<z.ZodEnum<{
        fix: "fix";
        retry: "retry";
        ask: "ask";
        bug: "bug";
    }>>;
    state: z.ZodOptional<z.ZodString>;
    result: z.ZodOptional<z.ZodUnknown>;
    next: z.ZodOptional<z.ZodArray<z.ZodObject<{
        does: z.ZodString;
        command: z.ZodOptional<z.ZodString>;
        needs: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>>>;
    issues: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        path: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        hint: z.ZodString;
        command: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type Answer = z.output<typeof Answer>;
export declare const Started: z.ZodObject<{
    name: z.ZodString;
    skill: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, z.core.$strip>;
export declare const Overview: z.ZodObject<{
    commands: z.ZodArray<z.ZodObject<{
        command: z.ZodString;
    }, z.core.$strip>>;
    shapes: z.ZodArray<z.ZodString>;
    roots: z.ZodArray<z.ZodObject<{
        root: z.ZodString;
        variable: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    remotes: z.ZodDefault<z.ZodArray<z.ZodString>>;
    codes: z.ZodDefault<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export declare const Facts: z.ZodObject<{
    fields: z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        option: z.ZodOptional<z.ZodString>;
        takes: z.ZodString;
        required: z.ZodOptional<z.ZodBoolean>;
        repeats: z.ZodOptional<z.ZodBoolean>;
    }, z.core.$strip>>;
    options: z.ZodArray<z.ZodObject<{
        option: z.ZodString;
    }, z.core.$strip>>;
    lists: z.ZodArray<z.ZodString>;
    example: z.ZodOptional<z.ZodUnknown>;
    output: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export type Facts = z.output<typeof Facts>;
/**
 * @param out - what a call wrote to stdout
 * @returns the answer of its last line, and what stands before that line
 */
export declare function answerIn(out: string): {
    answer: {
        ok: boolean;
        applied?: boolean | undefined;
        kind?: "fix" | "retry" | "ask" | "bug" | undefined;
        state?: string | undefined;
        result?: unknown;
        next?: {
            does: string;
            command?: string | undefined;
            needs?: string[] | undefined;
        }[] | undefined;
        issues?: {
            code: string;
            message: string;
            hint: string;
            path?: string | undefined;
            command?: string | undefined;
        }[] | undefined;
    } | undefined;
    beside: string;
};
/** @returns the result parsed by the schema, or undefined for one of another shape */
export declare const resultOf: <S extends z.ZodType>(answer: Answer | undefined, shape: S) => z.core.output<S> | undefined;
/**
 * A file that holds no table of fingerprints counts as none, and the kit writes it anew.
 *
 * @param text - the text of adx.stored.json, or undefined when there is none
 * @returns the fingerprint of each format number, per kind
 */
export declare function fingerprintsIn(text: string | undefined): Record<string, Record<string, string>>;
/** @returns the keys of the object a --json value holds, none for any other text */
export declare function keysIn(text: string | undefined): string[];
