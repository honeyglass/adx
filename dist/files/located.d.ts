import type { Disk, Issue, Root, Scope, Surroundings } from '../core/index.ts';
export type Moved = {
    option: string;
    folder: string;
};
/** The tool's name, for the default folder `~/.<name>`, and the roots it lists. */
type Tool = {
    name: string;
    roots: readonly Root[];
};
/** `moved` is set for a root whose variable or option named its folder. */
type Where = {
    folder: string;
    moved: boolean;
};
/**
 * @param call - the roots of the call
 * @param work - the call, which reads and writes files through its roots
 * @returns what the work answers; its error is thrown as it came
 */
export declare function within<T>(call: Located, work: () => Promise<T>): Promise<T>;
/** @throws a bug refusal, DECLARATION, for a file used while no call of its tool runs */
export declare function located(): Located;
export declare class Located {
    #private;
    readonly disk: Disk;
    readonly scope: Scope;
    constructor(tool: Tool, around: Surroundings, given: Readonly<Record<string, string>>);
    /**
     * @param root - a root of the tool
     * @returns its folder, which a default envDir folder need not have yet
     * @throws a refusal ROOT_NOT_FOUND for a folder that is not there, DECLARATION for a root the
     * tool does not list
     */
    folderOf(root: Root): Where;
    /**
     * A moved folder is checked before the call runs, so a wrong one never stands in a step; a
     * marker is looked for only when its root is used, since a command may not need it.
     *
     * @returns one ROOT_NOT_FOUND issue per root the call moved to a folder that is not there
     */
    issues(): Issue[];
    /** @returns each root the call moved, with its folder, for the commands adx names */
    moved(): Moved[];
}
/**
 * @param tool - the name of the tool and its roots
 * @param around - the home folder of the call
 * @returns the folder of each envDir root that nobody moved
 */
export declare function seedFolders(tool: Tool, around: Surroundings): string[];
export {};
