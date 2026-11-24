import type { Issue, Token } from '../core/index.ts';
import type { Answered } from './answered.ts';
import type { Obj, Spec } from './types.ts';
export type Kind = 'read' | 'list' | 'effect';
/** `tool` is the name of the tool, `words` the words of the command in its table. */
export type Place = {
    tool: string;
    words: string;
};
/** `fields` holds the names --fields gave, if any. */
export type Run = {
    dryRun: boolean;
    fields: readonly string[] | undefined;
};
export declare class Runner {
    #private;
    readonly kind: Kind;
    readonly spec: Spec;
    readonly input: Obj;
    /** Every place a tool lists the command; more than one is a DECLARATION error. */
    readonly places: Place[];
    constructor(kind: Kind, spec: Spec, global: Obj | undefined);
    get name(): string;
    /**
     * @param tokens - the tokens of the call after the command words
     * @param before - the issues of the tokens before the command words
     * @returns the answer of the call, and its terminal form
     */
    answer(tokens: readonly Token[], before: readonly Issue[]): Promise<Answered>;
    /**
     * @param value - the input of the call, from its options and --json, or from invoke
     * @param run - whether it is a dry run, and the fields the answer keeps
     * @returns the answer; a refusal of the handler and a bug are thrown
     */
    answered(value: unknown, run: Run): Promise<Answered>;
    /**
     * @returns one DECLARATION issue per field named like an option adx gives the command, per
     * option two fields would share, and per field the global input would replace
     */
    clashes(): Issue[];
}
