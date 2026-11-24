/**
 * @param error - any thrown value
 * @returns the status from 100 to 599, or undefined when no error of the chain is an HTTP answer
 */
export declare function status(error: unknown): number | undefined;
