import type { After, Commands, Empty, Global, Obj, Table } from '../command/index.ts';
import type { Step } from '../core/index.ts';
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
    /** Leave out for a tool whose commands share no input. */
    global?: Global<G>;
    /** Every command of the tool. A command built for another global input does not compile here. */
    commands: Commands<NoInfer<G>>;
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
    readonly commands: Table;
    readonly next: readonly object[];
    readonly hints: readonly Hint[];
    readonly start: (() => Maybe<readonly Step[]>) | undefined;
};
export declare function tool<G extends Obj = Empty>(spec: ToolSpec<G>): Tool;
export declare const specOf: (made: object) => Shell | undefined;
export {};
