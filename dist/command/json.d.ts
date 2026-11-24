import type { Issue } from '../core/index.ts';
/**
 * @param given - the fields the options of the call gave
 * @param text - the value of --json
 * @returns the input of both, and the issues; JSON.parse defines each key as an own property,
 * so a key named __proto__ stays a field
 */
export declare function withJson(given: Record<string, unknown>, text: string): {
    input: {};
    issues: Issue<string>[];
};
