export interface Tool {
    /**
     * Runs one call. It is the outermost function: a refusal that reaches it is answered by its
     * kind, and any other error once, here, as a bug with exit code 2. It never rejects.
     */
    main(): Promise<void>;
}
/** The command table: a key is one word of the call. */
export type Commands = {
    readonly [word: string]: object;
};
export type ToolSpec = {
    name: string;
    version: string;
    does: string;
    commands: Commands;
};
export declare function tool(spec: ToolSpec): Tool;
export declare const specOf: (made: object) => ToolSpec | undefined;
