/** @returns each entry below the folder, by its path relative to it */
export declare function snapshot(folder: string): Map<string, string>;
/** @returns each entry at the top of the working directory of the process */
export declare function testFolder(): Map<string, string>;
