/**
 * @param work - the call, which writes its answer itself and may log with console
 * @returns its result, and what console wrote to stdout and to stderr
 */
export declare function captured<T>(work: () => Promise<T>): Promise<{
    data: T;
    out: string;
    err: string;
}>;
