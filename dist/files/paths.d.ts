import { Issue } from '../core/index.ts';
import type { Entry, Root } from '../core/index.ts';
/** `real` is undefined when nothing stands at the path. */
export type Found = {
    rel: string;
    real: string;
    entry: Entry;
} | {
    rel: string;
    real: undefined;
};
/** `folders` are the folders the write makes first, from the top down. */
export type Target = {
    rel: string;
    path: string;
    entry: Entry | undefined;
    folders: string[];
};
/**
 * @param root - the root of the path
 * @param rel - the path as the caller or the author wrote it
 * @returns what stands there, or PATH_OUTSIDE
 * @throws a refusal of a root that is not there, or of a system error
 */
export declare function found(root: Root, rel: string): Found | Issue;
/**
 * @param root - the root of the path
 * @param rel - the path of the file to write
 * @returns the place of the file, or PATH_OUTSIDE, NOT_A_FOLDER or NOT_A_FILE
 * @throws a refusal of a root that is not there, or of a system error
 */
export declare function target(root: Root, rel: string): Target | Issue;
/**
 * @param root - the root of the path
 * @param rel - a path of the input
 * @param kind - what the field takes: a file to read, a file to write, or a folder
 * @returns the issue of the path, or undefined when it names what the field takes
 */
export declare function kindIssue(root: Root, rel: string, kind: 'in' | 'out' | 'dir'): Issue<string> | undefined;
/**
 * @param at - what a function of this file answered
 * @returns the result
 * @throws its issue as a refusal; nothing was changed, since files change only after plan
 */
export declare function openedOrThrown<T>(at: T | Issue): T;
/**
 * A system error of the disk, such as a folder without the right to read it, is the person's.
 *
 * @param work - reads of the disk before anything is written
 * @returns what the work answers
 * @throws its refusal as it came, and any other error as a refusal that changed nothing
 */
export declare function checked<T>(work: () => T): T;
/**
 * @param rel - a path relative to its root
 * @returns the path cleaned, `.` and empty parts left out and `..` taken back, or the path as
 * written when it leaves its root, so its issue names it
 */
export declare function cleaned(rel: string): string;
