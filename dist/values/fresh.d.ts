import type { Fresh } from '../core/index.ts';
type Maybe<T> = T | Promise<T>;
/** The function as a method, so the one of every typed fresh fits it without a cast. */
type Taker = {
    taken(input: Readonly<Record<string, unknown>>): Maybe<readonly string[]>;
};
/** For a new name: answers the names already taken. It refuses nothing. */
export declare function fresh<I>(taken: (input: Partial<I>) => Maybe<string[]>): Fresh<I>;
/** @returns what answers the taken names of a fresh(), or undefined for any other value */
export declare const takerOf: (value: object) => Taker | undefined;
export {};
