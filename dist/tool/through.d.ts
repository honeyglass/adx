import type { Answered, Run, Runner } from '../command/index.ts';
import type { Shell } from './tool.ts';
type Call = {
    runner: Runner;
    input: unknown;
    run: Run;
};
/**
 * @param shell - what the call reads of the tool
 * @param call - the command, the input as its caller gave it, and what the run is asked for
 * @returns the answer of the call
 * @throws any error that is no refusal of adx, as it came
 */
export declare function through(shell: Shell, call: Call): Promise<Answered>;
export {};
