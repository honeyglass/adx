import type { Issue, Stdin } from '../core/index.ts';
/**
 * @param given - the fields the options of the call gave
 * @param value - the value of --json
 * @param stdin - what the call reads from stdin, read only for `-`; none for a call that runs
 * nothing, such as --help
 * @returns the input of both, and the issues
 */
export declare function jsonInput(given: Record<string, unknown>, value: string, stdin: Stdin | undefined): Promise<{
    input: {};
    issues: Issue<string>[];
}>;
