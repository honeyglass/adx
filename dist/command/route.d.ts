import type { Issue, Token } from '../core/index.ts';
import type { Answered } from './answered.ts';
import type { Runner } from './runner.ts';
import type { Table } from './table.ts';
export type Routed = {
    found: 'command';
    runner: Runner;
    rest: readonly Token[];
    before: Issue[];
} | {
    found: 'group';
    words: string[];
    table: Table;
} | {
    found: 'nothing';
    issues: Issue[];
};
/**
 * @param root - the command table of the tool
 * @param tokens - every token of the call
 * @param tool - the name of the tool, the first word of every command it names
 * @returns the command with the tokens after it and the issues before it, the group the words
 * end at, or the issues when there is no command; such a list holds at least one
 */
export declare function route(root: Table, tokens: readonly Token[], tool: string): Routed;
/**
 * @param table - the table of the group, the whole table for the tool alone
 * @param words - the words of the group, the tool's name first
 * @returns every command below the group, each with its words and what it does
 */
export declare function listed(table: Table, words: readonly string[]): Answered;
