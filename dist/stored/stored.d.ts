import type { z } from 'zod';
import type { Stored } from '../core/index.ts';
/** One format: its number, its schema, and the read of its fields up to the current format. */
type Format<T> = {
    readonly version: number;
    readonly shape: z.ZodType;
    read(fields: unknown): {
        data: T;
    } | {
        failure: string;
    };
};
export declare function stored<S extends z.ZodType>(name: string, version: number, shape: S): Stored<z.output<S>>;
/** A kind made some other way than with stored() has no formats adx can check. */
export declare const formatsOf: (kind: Stored<unknown, never>) => readonly Format<unknown>[];
export declare const isFormatNumber: (version: unknown) => version is number;
export {};
