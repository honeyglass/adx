import type { Issue, Target, TargetField, Token } from '../core/index.ts';
import type { Answered } from './answered.ts';
import type { Obj, Spec } from './types.ts';
export type Kind = 'read' | 'list' | 'effect';
/** `fields` holds the names --fields gave, if any. */
export type Run = {
    dryRun: boolean;
    fields: readonly string[] | undefined;
};
/** The input of a call as its options and --json gave it, and what the run is asked for. */
export type Ready = {
    input: Record<string, unknown>;
    run: Run;
};
/** The tool answers a call of its command with the steps after it and the hints of its codes. */
export type Through = (call: {
    runner: Runner;
    input: unknown;
    run: Run;
}) => Promise<Answered>;
/** `tool` is the name of the tool, `words` the words of the command in its table. */
export type Place = {
    tool: string;
    words: string;
    through: Through;
};
export declare class Runner implements Target {
    #private;
    readonly kind: Kind;
    readonly spec: Spec;
    readonly input: Obj;
    /** Every place a tool lists the command; more than one is a DECLARATION error. */
    readonly places: Place[];
    constructor(kind: Kind, spec: Spec, global: Obj | undefined);
    get name(): string;
    get does(): string;
    get call(): string[] | undefined;
    /** @returns each field of the input with its option, the global fields marked */
    fields(): TargetField[];
    /** @returns whether the schema of the field takes the value a step would carry */
    accepts(field: string, value: unknown): Promise<boolean>;
    /**
     * @param tokens - the tokens of the call after the command words
     * @param before - the issues of the tokens before the command words
     * @returns the answer when the call ends before its handler, else the call ready for it
     */
    read(tokens: readonly Token[], before: readonly Issue[]): Answered | Ready;
    /**
     * invoke answers as the tool that lists the command, and as the command alone before one does.
     *
     * @param input - the input of the call
     * @param run - whether it is a dry run
     * @returns the answer; a refusal and a bug are thrown
     */
    through(input: unknown, run: Run): Promise<Answered>;
    /**
     * @param value - the input of the call, from its options and --json, or from invoke
     * @param run - whether it is a dry run, and the fields the answer keeps
     * @returns the answer; a refusal of `check` or the handler, and a bug, are thrown
     */
    answered(value: unknown, run: Run): Promise<Answered>;
    /**
     * @returns one DECLARATION issue per field named like an option adx gives the command, per
     * option two fields would share, and per field the global input would replace
     */
    clashes(): Issue[];
}
