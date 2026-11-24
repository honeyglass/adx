import type { Issue } from '../core/index.ts';
import type { Act, Sources } from '../core/index.ts';
import type { RootOption, Runner, Through } from './runner.ts';
export type Table = {
    readonly [word: string]: object;
};
export declare const isWord: (key: string) => boolean;
/** A value of the table that is an object of objects, which a group is; a command is one too. */
export declare const isTable: (value: object) => value is Table;
/**
 * @param table - the command table, or a group of it
 * @param tool - the name of the tool that lists it, how it answers an invoke of a command, the
 * port to the sources of the fields, the roots of the tool, and the send of its remotes
 * @param words - the words of the group
 */
export declare function placeAll(table: Table, tool: {
    name: string;
    through: Through;
    sources: Sources;
    roots: readonly RootOption[];
    act: Act;
}, words?: readonly string[]): void;
/** @returns the issues of the keys, of commands listed in more than one place, and of fields */
export declare function declarationIssues(table: Table): Issue[];
/** @returns the runner of every command the table lists, at any depth, each once */
export declare function runnersIn(table: Table): Set<Runner>;
