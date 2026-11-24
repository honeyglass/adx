import type { Needs } from '../core/index.ts';
/**
 * Returned by a source that cannot answer before other fields are known.
 * Name every field that is surely missing at this point; adx refuses with one issue per field.
 */
export declare function needs<K extends string>(...fields: [K, ...K[]]): Needs<K>;
/** @returns the fields a needs() names, or undefined for a value it did not make */
export declare const neededOf: (made: object) => readonly string[] | undefined;
