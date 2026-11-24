import type { Answered, Run, Runner, Scene } from '../command/index.ts';
import type { Surroundings } from '../core/index.ts';
import type { Shell } from './tool.ts';
type Call = {
    runner: Runner;
    input: unknown;
    run: Run;
};
/**
 * @param shell - what the call reads of the tool
 * @param call - the command, the input as its caller gave it, and what the run is asked for
 * @param around - the variables, folders and disk of the call
 * @returns the answer of the call
 * @throws any error that is no refusal of adx, as it came
 */
export declare function through(shell: Shell, call: Call, around: Surroundings): Promise<Answered>;
/** @param call - the command, its input, its run, and the samples of the test that invokes it */
export declare function invoked(shell: Shell, call: Call & {
    scene: Scene;
}): Promise<Answered>;
export {};
