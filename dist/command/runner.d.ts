import type { Declared, Issue, Sourced, Sources, TargetField, Token } from '../core/index.ts';
import type { Answered } from './answered.ts';
import type { Obj, Shared, Spec } from './types.ts';
export type Kind = 'read' | 'list' | 'effect';
/** `fields` holds the names --fields gave, if any; `lists` the field whose option came alone. */
export type Run = {
    dryRun: boolean;
    fields: readonly string[] | undefined;
    lists: string | undefined;
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
/**
 * `tool` is the name of the tool, `words` the words of the command in its table, and `sources`
 * the port through which the command asks the sources of its fields.
 */
export type Place = {
    tool: string;
    words: string;
    through: Through;
    sources: Sources;
};
export declare class Runner implements Sourced {
    #private;
    readonly kind: Kind;
    readonly spec: Spec;
    readonly input: Obj;
    /** Every place a tool lists the command; more than one is a DECLARATION error. */
    readonly places: Place[];
    constructor(kind: Kind, spec: Spec, global: Shared | undefined);
    get name(): string;
    get does(): string;
    get call(): string[] | undefined;
    /** @returns each field of the input with its option, the global fields marked */
    fields(): TargetField[];
    /**
     * The command's own `values` win, then those of the global input for a global field it takes;
     * an enum is a source of its own values.
     *
     * @returns the source of the field, or undefined for a field without one
     */
    sourceOf(field: string): Declared | undefined;
    /**
     * The one place that decides a value a step carries (decision 79): it passes the schema of
     * the field, and its source takes it. A command no tool lists has no sources to ask, so the
     * value stays out.
     *
     * @param field - the field the step carries
     * @param value - the value of the refused call
     * @param beside - the other fields a real call of the step would hold
     * @returns whether a real call of the command would take the value
     */
    accepts(field: string, value: unknown, beside: Readonly<Record<string, unknown>>): Promise<boolean>;
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
     * @param run - whether it is a dry run, the fields the answer keeps, and a field to list
     * @returns the answer, or the values of the field to list; a refusal of the schema, of a list,
     * of `check` or of the handler, and a bug, are thrown
     */
    answered(value: unknown, run: Run): Promise<Answered>;
    /**
     * @returns one DECLARATION issue per field named like an option adx gives the command, per
     * option two fields would share, and per field the global input would replace
     */
    clashes(): Issue[];
}
