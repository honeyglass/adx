import type { Checked, Samples } from './run.ts';
/** `command` names the command the probe calls, by its words, for the checks of its kind. */
export type Asked = {
    argv: readonly string[];
    stdin?: string;
    command?: string;
};
export type Called = Asked & {
    exit: number | null;
    out: string;
    err: string;
    /** Each path of the scratch folder the call made, changed or removed. */
    changed: string[];
    /** Each request a fake answered, such as `POST /tickets`. */
    sent: string[];
};
export interface Session {
    call(asked: Asked): Promise<Called>;
}
/**
 * What conformance uses of the TestContext of node:test: a subtest per probe, a cleanup when the
 * test ends, and a todo for a probe that cannot run yet.
 */
export interface Context {
    test(name: string, run: (t: Context) => Promise<void>): Promise<unknown>;
    after(run: () => void): void;
    todo(message: string): void;
}
export interface Caller {
    /** Runs the work in a fresh scratch folder with the seed copied in. */
    session<T>(work: (session: Session) => Promise<T>): Promise<T>;
    /** Which folders a call's `changed` covers, for a finding about what it changed. */
    readonly watched: string;
}
/**
 * @param tool - the value tool() returned
 * @param samples - the variables, the seed and the fakes of every call
 * @throws a fix RefusalError for a tool that tool() did not make
 */
export declare function toolCaller(tool: Checked, samples: Samples): Caller;
/** @returns the path of each entry that is new, gone or different */
export declare const changedIn: (before: ReadonlyMap<string, string>, after: ReadonlyMap<string, string>) => string[];
