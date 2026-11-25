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
    /** The remotes `schema` names, and the codes it lists beside adx's, which the tool made. */
    remotes: string[];
    codes: string[];
    /** The skill the start answer names, or undefined without one. */
    skill: string | undefined;
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
    /** The calls of the commands answers named, a part of `calls` that belongs to no probe. */
    readonly namedCalls: Called[];
    /** What the commands the answers named broke. */
    readonly named: string[];
    constructor(caller: Caller);
    /**
     * @returns the tool as the start answer and `schema` show it
     * @throws a refusal SCHEMA at `command` when neither the start answer nor `schema` names the
     * tool, since no probe can run then
     */
    known(): Promise<Known>;
    /** @returns the call in a fresh scratch folder, after each command its answer names ran there */
    ask(asked: Asked): Promise<Called>;
    /** @returns a call in a fresh scratch folder that no later check reads, such as one in text */
    alone(asked: Asked): Promise<Called>;
    /**
     * The closed network of the kit refuses a request to a remote without a fake, so such a call
     * shows nothing of the rule it probes, and counts as not probed. Its message ends with the
     * kit's token, which no program can guess, so a refusal the program prints itself still counts.
     *
     * @returns the remote without a fake that refused the call, or undefined
     */
    unreached(called: Called): string | undefined;
    /** The remotes `schema` names that no fake stands for. */
    get unfaked(): readonly string[];
    /** @returns each code an answer of a call so far raised */
    raised(): Set<string>;
    /** Which folders a call's `changed` covers. */
    get watched(): string;
    /** @returns the call as an agent would type it, the tool's name first */
    line(called: Asked): string;
    /** @returns the words of the call, the tool's name first */
    wordsOf(called: Asked): string[];
}
/** @returns the first issue of an answer, or what stands in place of one */
export declare const firstOf: (answer: Answer | undefined) => string;
