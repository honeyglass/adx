export type ProgramCall = {
    argv: readonly string[];
    cwd: string;
    home: string;
    tmp: string;
    env: Readonly<Record<string, string>>;
    stdin: string | null;
};
/**
 * @param words - the command line that starts the tool, such as ['node', 'bin/tracker.ts']
 * @param call - the arguments, the folders, the variables and stdin of the call
 * @returns the exit code, or null for a program that was killed, and what it wrote
 * @throws a refusal FILE_NOT_FOUND at `command` when the command line starts no program
 */
export declare function program(words: readonly string[], call: ProgramCall): Promise<{
    exit: number | null;
    out: string;
    err: string;
}>;
