import type { Issue, Token } from '../core/index.ts';
import type { Takes } from './input.ts';
/** `field` is set for the option of a field, and absent for an option of adx such as --json. */
export type Option = {
    name: string;
    takes: Takes;
    repeats: boolean;
    field?: string;
};
export type Read = {
    /** The value of each field an option gave, by the name of the field. */
    given: Record<string, unknown>;
    /** The value of each option of adx, by its name; a switch is true. */
    adx: Record<string, unknown>;
    /** The first option that came alone and lists its values. */
    listed: string | undefined;
    /** Every option the call gave, given a value or alone, by its name. */
    seen: Set<string>;
    issues: Issue[];
};
type Call = {
    command: string;
    listable: ReadonlySet<string>;
};
/**
 * @param tokens - the tokens after the command words
 * @param options - every option the command takes, by its name without dashes
 * @param call - the words of the command, for the messages, and the options that may come alone
 * @returns what the options give, which listable option came alone, and the issues in the order
 * of the tokens
 */
export declare function argumentsOf(tokens: readonly Token[], options: ReadonlyMap<string, Option>, call: Call): Read;
/**
 * A run of capitals is one word, so baseURL is base-url and Name is name (decision 51).
 *
 * @param field - the name of a field
 * @returns the name of its option in kebab case, without the dashes
 */
export declare const optionName: (field: string) => string;
export {};
