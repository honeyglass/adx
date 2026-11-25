/**
 * Where the values of a field come from, and the port through which a command asks its sources.
 *
 * Choice, Source, Needs, Fresh, ListRef: the types of proto/adx/index.d.ts for a source.
 * needsBrand, freshBrand, refBrand: their brands, real symbols, so values/ makes branded values.
 * Declared: any source as adx calls it, whatever input its command types.
 * Sourced, Known, Listed, Sources: a command as its sources see it, the input it knows, the
 * answer of an option alone, and the port that values/ fills and the tool hands each command.
 *
 * The brands are values, not `declare const`, since a class of values/ names them as its keys.
 * The command asks through the port because a feature imports no other feature: the tool, which
 * puts the features together, gives the port to every command it lists.
 *
 * @example const listed = await place.sources.listed(runner, 'lang', { given, checked });
 */
import type { Issue } from './issue.ts';
import type { Step, Target } from './step.ts';
type Maybe<T> = T | Promise<T>;
export type Choice = {
    value: string;
    does?: string;
};
export declare const needsBrand: unique symbol;
export declare const freshBrand: unique symbol;
export declare const refBrand: unique symbol;
export interface Needs<K extends string> {
    readonly [needsBrand]: K;
}
export type Source<I> = (input: Partial<I>) => Maybe<Choice[] | Needs<keyof I & string>>;
export interface Fresh<I> {
    readonly [freshBrand]: (input: Partial<I>) => Maybe<string[]>;
}
export interface ListRef {
    readonly [refBrand]: 'key' | 'detail';
}
/**
 * A source written as a method's type, whose parameter TypeScript compares both ways, so every
 * typed source of `values` fits it, and adx calls it with the input of any command.
 */
type Asking = {
    ask(input: Readonly<Record<string, unknown>>): Maybe<Choice[] | Needs<string>>;
}['ask'];
/** A value of `values`, or an enum's fixed list as a source. */
export type Declared = Asking | Fresh<never> | ListRef;
export interface Sourced extends Target {
    /** The source of the field: in `values`, in `values` of the global input, or its enum. */
    sourceOf(field: string): Declared | undefined;
}
export type Known = {
    /** The input as the caller gave it, which a command adx derives carries. */
    given: Readonly<Record<string, unknown>>;
    /** The input as far as it passed the schema, which a source gets. */
    checked: Readonly<Record<string, unknown>>;
};
/** What an option alone answers: the values, the names taken, or why it cannot list them. */
export type Listed = {
    values: readonly Choice[];
} | {
    taken: readonly string[];
} | {
    issues: readonly [Issue, ...Issue[]];
};
export interface Sources {
    /** The answer of the field's option given without a value (rule 13). */
    listed(command: Sourced, field: string, known: Known): Promise<Listed>;
    /** One issue per value outside its list, and per field a list needs first. */
    outside(command: Sourced, known: Known): Promise<Issue[]>;
    /** Whether the source of the field would take the value, beside the other fields of a call. */
    accepts(command: Sourced, field: string, value: unknown, beside: Known): Promise<boolean>;
    /** The step that lists the values of the field, carrying the call; undefined without a source. */
    listStep(command: Sourced, field: string, given: Known['given']): Step | undefined;
}
export {};
