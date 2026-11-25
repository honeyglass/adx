/**
 * The internal types of core/: what one call gets from its surroundings, and what it leaves.
 *
 * Token: one word of the arguments, as util.parseArgs reads it in its lenient mode.
 * Piped, Stdin: what is piped in, and its read.
 * Disk, Entry: the port to the file system, and what stands at a path.
 * Scope: the port that keeps the values of a call across its awaits, each under its key.
 * Surroundings, Around: the variables, the home folder, the working directory, the disk and the
 * network of a call, and with them its tokens, whether stdout is a terminal, and stdin.
 * Ran: the exit code and what the call wrote to stdout and stderr; the test kit's run answers it.
 *
 * main() takes them from Node, and run() from its options, so both go through one call. Only
 * node/ reads the arguments with util.parseArgs; the call gets its tokens, and checks each itself.
 *
 * @example const ran = await call(spec, { tokens: tokensOf(['greet']), tty: false, stdin });
 */
import type { Exit } from './answer.ts';
import type { Fake, Network } from './remote.ts';
/** An option without `=` has no value; the word after it, if any, is a positional of its own. */
export type Token = {
    kind: 'option';
    name: string;
    rawName: string;
    value?: string;
    inlineValue?: boolean;
} | {
    kind: 'positional';
    value: string;
} | {
    kind: 'option-terminator';
};
/**
 * The text piped in, cut one character past STDIN_LIMIT, so a longer one shows past the limit;
 * `utf8: false` for bytes that are no UTF-8; null when stdin is a terminal.
 */
export type Piped = {
    text: string;
} | {
    utf8: false;
} | null;
/** Read only for `--json -`, so a call that does not name stdin never waits on it. */
export type Stdin = () => Promise<Piped>;
/** What stands at a path, its last link not followed. */
export type Entry = 'file' | 'folder' | 'link' | 'other';
/**
 * Synchronous, since `files.write` answers at once and `exists` is a property. A path is absolute;
 * `rel` is relative, with `/` between its parts. A system error is thrown as Node raised it.
 */
export interface Disk {
    isAbsolute(path: string): boolean;
    join(folder: string, rel: string): string;
    parent(path: string): string;
    /** Every link followed; undefined when nothing stands there. */
    real(path: string): string | undefined;
    /** Whether the path is the folder or lies below it. */
    within(path: string, folder: string): boolean;
    /** Undefined when nothing stands there. */
    entry(path: string): Entry | undefined;
    /** Opens no link; undefined when the file holds more than `limit` bytes. */
    read(path: string, limit: number): Uint8Array | undefined;
    /** The names in a folder, sorted. */
    names(folder: string): string[];
    mode(path: string): number;
    /** The size in bytes, a final link followed. */
    size(path: string): number;
    makeFolder(path: string, mode: number): void;
    /** Removes an empty folder. */
    removeFolder(path: string): void;
    /** A temporary file beside the path, whole and on disk; it answers the temporary path. */
    stage(path: string, bytes: Uint8Array, mode: number): string;
    move(from: string, to: string): void;
    remove(path: string): void;
    /** Text as a file holds it, in UTF-8. */
    encode(text: string): Uint8Array;
    /** The text of a file's bytes, a byte order mark kept; undefined for bytes that are no UTF-8. */
    decode(bytes: Uint8Array): string | undefined;
}
/**
 * The values one call keeps across its awaits, such as its roots, so two calls in one process,
 * as two tests that run at once, never read each other's. Each feature keeps its own under a key.
 */
export interface Scope {
    /** Runs the work with the value under the key, beside the values the call holds already. */
    run<T>(key: object, value: unknown, work: () => Promise<T>): Promise<T>;
    /** The value under the key in the call that runs, or undefined. */
    get(key: object): unknown;
}
export type Surroundings = {
    readonly env: Readonly<Record<string, string | undefined>>;
    /** The folder `~` names. */
    readonly home: string;
    readonly cwd: string;
    readonly disk: Disk;
    readonly scope: Scope;
    readonly network: Network;
    /** The fakes of a test, which answer in place of the servers of their remotes. */
    readonly fakes?: readonly Fake[];
    /**
     * The scratch folder of a test, which no root leaves: a root at an absolute place of its own
     * lies in it, and a marker is looked for no higher, nor above a working directory the test
     * names.
     */
    readonly confined?: string;
};
export type Around = Surroundings & {
    readonly tokens: readonly Token[];
    readonly tty: boolean;
    readonly stdin: Stdin;
};
export interface Ran {
    readonly exit: Exit;
    /** What the call wrote to stdout. */
    readonly out: string;
    /** What the call wrote to stderr. */
    readonly err: string;
}
