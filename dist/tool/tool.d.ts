import type { After, Commands, Empty, Global, Obj, Table } from '../command/index.ts';
import type { Remote, Root, Step, Stored } from '../core/index.ts';
import type { Shapes } from '../shapes/index.ts';
import type { Hint } from '../steps/index.ts';
export interface Tool {
    /**
     * Runs one call. It is the outermost function: a refusal that reaches it is answered by its
     * kind, and any other error once, here, as a bug with exit code 2. It never rejects.
     */
    main(): Promise<void>;
}
type Maybe<T> = T | Promise<T>;
export interface ToolSpec<G extends Obj> {
    name: string;
    version: string;
    does: string;
    /**
     * The name of the agent skill, which lies where Claude Code looks for it:
     * `~/.claude/skills/<name>/SKILL.md`, put there by the tool's own install. The tool never opens
     * the file; the start answer shows the name, and the test kit checks that it is a skill.
     */
    skill?: string;
    roots?: Root[];
    remotes?: Remote[];
    /** Every kind of data the tool keeps, so `schema` shows its format number and the test kit checks it. */
    stored?: Stored<unknown, never>[];
    /** Leave out for a tool whose commands share no input. */
    global?: Global<G>;
    /** Every command of the tool. A command built for another global input does not compile here. */
    commands: Commands<NoInfer<G>>;
    /**
     * Schemas a caller writes and no command takes whole, each under the word that names it.
     * `schema` lists the names, `schema <name>` prints one, and a `SCHEMA` issue inside one names
     * that call.
     */
    shapes?: Shapes;
    /** Steps `after` a command, for the steps that cross folders. */
    next?: After<NoInfer<G>>[];
    /** The command of a `hint` for a code, for the hints that cross folders. */
    hints?: Hint[];
    /** The first steps of the start answer (the tool called alone). */
    start?: () => Maybe<Step[]>;
}
/** What one call reads of a tool. */
export type Shell = {
    readonly name: string;
    readonly version: string;
    readonly does: string;
    readonly skill: string | undefined;
    readonly commands: Table;
    readonly roots: readonly Root[];
    readonly remotes: readonly Remote[];
    readonly stored: readonly Stored<unknown, never>[];
    readonly shapes: Shapes;
    readonly next: readonly object[];
    readonly hints: readonly Hint[];
    readonly start: (() => Maybe<readonly Step[]>) | undefined;
};
export declare function tool<G extends Obj = Empty>(spec: ToolSpec<G>): Tool;
export declare const specOf: (made: object) => Shell | undefined;
export {};
