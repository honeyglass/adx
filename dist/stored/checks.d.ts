import type { Stored } from '../core/index.ts';
/**
 * @param kind - a kind the tool lists in `stored`
 * @returns an issue when a number is no whole number from 1, or lies not below the one before,
 * and one per format whose schema has a field `version`
 */
export declare function kindIssues(kind: Stored<unknown, never>): import("../core/issue.ts").Issue<never>[];
