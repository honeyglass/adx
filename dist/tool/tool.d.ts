import type { Commands, Empty, Global, Obj, Table } from '../command/index.ts';
export interface Tool {
    /**
     * Runs one call. It is the outermost function: a refusal that reaches it is answered by its
     * kind, and any other error once, here, as a bug with exit code 2. It never rejects.
     */
    main(): Promise<void>;
}
export interface ToolSpec<G extends Obj> {
    name: string;
    version: string;
    does: string;
    /** Leave out for a tool whose commands share no input. */
    global?: Global<G>;
    /** Every command of the tool. A command built for another global input does not compile here. */
    commands: Commands<NoInfer<G>>;
}
/** What one call reads of a tool. */
export type Shell = {
    readonly name: string;
    readonly commands: Table;
};
export declare function tool<G extends Obj = Empty>(spec: ToolSpec<G>): Tool;
export declare const specOf: (made: object) => Shell | undefined;
