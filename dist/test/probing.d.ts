import { Facts } from './answer.schema.ts';
import type { Answer } from './answer.schema.ts';
import type { Asked, Called, Caller } from './caller.ts';
export type Command = {
    words: string[];
    facts: Facts;
    /** The input of a call that must succeed: the command's example, or {} without a required field. */
    example: Record<string, unknown> | undefined;
};
export type Known = {
    name: string;
    commands: Command[];
    shapes: string[];
    /** The words of each group, which lists its commands when called alone. */
    groups: string[][];
    /** What the start answer and `schema` broke, for their probes. */
    started: string[];
    schema: string[];
    /** Each command with a required field and no example, which no probe can call validly. */
    unexampled: string[];
};
export declare class Probing {
    #private;
    readonly calls: Called[];
    /** What the commands the answers named broke. */
    readonly named: string[];
    constructor(caller: Caller);
    /**
     * @returns the tool as the start answer and `schema` show it
     * @throws a fix RefusalError when the start answer names no tool, since no probe can run then
     */
    known(): Promise<Known>;
    /** @returns the call in a fresh scratch folder, after each command its answer names ran there */
    ask(asked: Asked): Promise<Called>;
    /** @returns a call in a fresh scratch folder that no later check reads, such as one in text */
    alone(asked: Asked): Promise<Called>;
    /** Which folders a call's `changed` covers. */
    get watched(): string;
    /** @returns the call as an agent would type it, the tool's name first */
    line(called: Asked): string;
}
/** @returns the first issue of an answer, or what stands in place of one */
export declare const firstOf: (answer: Answer | undefined) => string;
