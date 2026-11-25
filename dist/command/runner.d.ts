import type { Act, Declared, Fake, Issue, Sourced, Sources, Stdin, Step, TargetField, Token, Writer } from '../core/index.ts';
import type { Answered } from './answered.ts';
import type { AdxOption } from './help.ts';
import type { Obj, Shared, Spec } from './types.ts';
export type Kind = 'read' | 'list' | 'effect';
/**
 * `fields` holds the names --fields gave, if any; `lists` the field whose option came alone;
 * `page` the cursor --page gave; `replace` whether the call said --replace; `folders` the folder
 * each root option gave, by the name of its root.
 */
export type Run = {
    dryRun: boolean;
    fields: readonly string[] | undefined;
    lists: string | undefined;
    page: string | undefined;
    replace: boolean;
    folders: Readonly<Record<string, string>>;
};
/** The samples of an invoke in a test: its variables, the seed of its data folder, its fakes. */
export type Scene = {
    env?: Readonly<Record<string, string>>;
    seed?: string;
    fakes?: readonly Fake[];
};
/** The input of a call as its options and --json gave it, and what the run is asked for. */
export type Ready = {
    input: Record<string, unknown>;
    run: Run;
};
/** The tool answers an invoke of its command with the steps after it and the hints of its codes. */
export type Through = (call: {
    runner: Runner;
    input: unknown;
    run: Run;
    scene: Scene;
}) => Promise<Answered>;
/** A root of the tool; one with a variable the call can also move with an option of its name. */
export type RootOption = {
    name: string;
    variable?: string;
};
/**
 * `tool` is the name of the tool, `words` the words of the command in its table, `sources` the
 * port through which the command asks the sources of its fields, `roots` the tool's roots, and
 * `act` the send its `apply` gets.
 */
export type Place = {
    tool: string;
    words: string;
    through: Through;
    sources: Sources;
    roots: readonly RootOption[];
    act: Act;
};
/** The options adx gives some command, and the commands each goes to, as `schema` lists them. */
export declare const SHARED_OPTIONS: {
    option: string;
    takes: import("./input.ts").Takes;
    does: string;
    for: string;
}[];
/** Every option adx gives some command, so no root option may take its name. */
export declare const ADX_OPTIONS: string[];
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
     * A step carries a path as adx shows it, cleaned and relative to its root, so
     * `./internal/billing/` rides along as `internal/billing`; a field that fails its schema stays
     * as given.
     *
     * @param given - the input of the call as its caller gave it
     * @returns the same input, each path field, or list of paths, as adx shows it
     */
    shown(given: Readonly<Record<string, unknown>>): Record<string, unknown>;
    /**
     * @param tokens - the tokens of the call after the command words
     * @param before - the issues of the tokens before the command words
     * @param stdin - what the call reads from stdin, read only for `--json -` and never for --help
     * @returns the answer when the call ends before its handler, else the call ready for it
     */
    read(tokens: readonly Token[], before: readonly Issue[], stdin: Stdin): Promise<Answered | Ready>;
    /**
     * invoke answers as the tool that lists the command, and as the command alone before one does.
     *
     * @param input - the input of the call
     * @param run - whether it is a dry run, and whether it may replace a file
     * @param scene - the variables and the seed of the test that invokes the command
     * @returns the answer; a refusal and a bug are thrown
     */
    through(input: unknown, run: Run, scene: Scene): Promise<Answered>;
    /**
     * @param value - the input of the call, from its options and --json, or from invoke
     * @param run - whether it is a dry run, the fields the answer keeps, and a field to list
     * @param writer - the writes of the call, which a tool gives; none for a command no tool lists
     * @returns the answer, or the values of the field to list; a refusal of the schema, of a path,
     * of a list, of `check` or of the handler, and a bug, are thrown
     */
    answered(value: unknown, run: Run, writer: Writer | undefined): Promise<Answered>;
    /**
     * @returns one DECLARATION issue per field named like an option adx gives the command, per
     * option two fields would share, and per field the global input would replace
     */
    clashes(): Issue[];
    /**
     * The compiler checks the type of an example, not its values, such as a `.regex()`.
     *
     * Only the input schema is checked here. A path that leaves its root, a `check` rule across
     * fields and a value outside a source of `values` show only at a call, since they need the
     * disk, the whole input or the sources.
     *
     * @returns one DECLARATION issue per place where the example `schema` shows fails the input,
     * or one for an input that throws on the example, such as in a transform
     */
    exampleIssues(): Issue[];
    /**
     * @returns what `schema <command>` shows beside its input: the facts of --help, the fields
     * whose option alone lists their values, and the global fields the command takes
     */
    schemaFacts(): {
        replace?: string | undefined;
        key?: string | undefined;
        outline?: string[] | undefined;
        pageSize?: number | undefined;
        lists: string[];
        global: string[];
        example?: {} | null | undefined;
        command: string;
        does: string;
        fields: {
            repeats?: boolean | undefined;
            default?: {} | null | undefined;
            required?: boolean | undefined;
            does?: string | undefined;
            takes: import("./input.ts").Takes;
            option?: string | undefined;
            field: string;
        }[];
        options: readonly AdxOption[];
    };
    /** @returns the schema of the answer, which only a read declares, with `output` */
    output(): import("zod").ZodType<unknown, unknown, import("zod/v4/core").$ZodTypeInternals<unknown, unknown>> | undefined;
    /** @returns the schema of one item, which only a list declares */
    item(): Obj | undefined;
    /** @returns the fields of an item that the outline of a list leaves out */
    hidden(): string[];
    /** The size of every page of a list: its own, or 50 (decision 56). */
    pageSize(): number;
    /** @returns the step to what the command takes, or undefined while no tool lists it */
    schemaStep(): Step | undefined;
}
