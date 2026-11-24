import type { Step } from '../core/index.ts';
export type NextStep = {
    does: string;
    command?: string;
    needs?: string[];
};
/** `tool` names the tool that answers; `input` is the input of the call as its caller gave it. */
export type Context = {
    tool: string;
    input: Readonly<Record<string, unknown>>;
};
/**
 * @param step - a step a command, a hint or the tool named
 * @param context - the call that answers it
 * @returns the step as the answer writes it; a step from tell has no command
 * @throws a bug refusal, DECLARATION, for a step to a command that no tool lists
 */
export declare function stepAnswer(step: Step, context: Context): Promise<NextStep>;
