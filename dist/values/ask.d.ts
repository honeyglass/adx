import type { AnyList, Choice, Declared } from '../core/index.ts';
export type Asked = {
    kind: 'choices';
    choices: readonly Choice[];
} | {
    kind: 'needs';
    fields: readonly string[];
} | {
    kind: 'taken';
    names: readonly string[];
} | {
    kind: 'list';
    list: AnyList;
} | {
    kind: 'none';
};
/**
 * @param field - the field whose source it is, for the message of a bug
 * @param source - the source of the field, if it has one
 * @param input - the input of the call as far as it passed the schema and its lists
 * @returns the choices, the fields it needs first, the names taken, or the list of its keys
 * @throws a bug refusal, DECLARATION, for an answer of no kind, or a needs() of a field it got
 */
export declare function asked(field: string, source: Declared | undefined, input: Readonly<Record<string, unknown>>): Promise<Asked>;
