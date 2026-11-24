/** @param cwd - the working directory the test names, kept after the call */
export declare function scratch(cwd: string | undefined): {
    folder: string;
    home: string;
    cwd: string;
    disk: import("../core/types.ts").Disk;
    scope: import("../core/types.ts").Scope;
    remove: () => void;
};
/**
 * @param seed - the folder of files the tool should find
 * @param folder - the data folder of a root, which the copy makes
 */
export declare function seeded(seed: string, folder: string): void;
