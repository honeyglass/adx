import type { z } from 'zod';
import type { Dir, File, Root, Stored } from '../core/index.ts';
/** What the field of a handle takes; `plain` is a handle the author made, which no field checks. */
export type Kind = 'plain' | 'in' | 'out' | 'dir';
export declare class Handle implements File {
    readonly root: Root;
    readonly rel: string;
    readonly kind: Kind;
    constructor(root: Root, rel: string, kind: Kind);
    /** A file stands there; a folder, or nothing, is no file. */
    get exists(): boolean;
    bytes(limit: number): Promise<Uint8Array<ArrayBufferLike>>;
    text(limit: number): Promise<string>;
    json<T>(limit: number, shape: Stored<T, any>): Promise<T>;
    json<S extends z.ZodType>(limit: number, shape: S): Promise<z.output<S>>;
}
export declare class Tree implements Dir {
    readonly root: Root;
    readonly rel: string;
    constructor(root: Root, rel: string);
    walk(suffix?: string): AsyncIterable<File>;
}
/** A handle for a path that leaves its root keeps the path as written, so its issue names it. */
export declare const handle: (root: Root, rel: string, kind: Kind) => Handle;
export declare const tree: (root: Root, rel: string) => Tree;
/**
 * @param root - the root of the folder
 * @param folder - the folder, relative to the root
 * @param suffix - the end of every name listed, such as `.json`
 * @returns each file directly in the folder whose name ends in the suffix, by name, with its stem;
 * none when the folder is not there
 */
export declare function listed(root: Root, folder: string, suffix: string): (Handle & {
    stem: string;
})[];
/**
 * @param root - the root of the file
 * @param rel - the file, relative to the root
 * @param limit - the most bytes the file may hold
 * @returns its bytes
 * @throws a refusal FILE_NOT_FOUND, NOT_A_FILE, INPUT_TOO_LARGE, or of a system error
 */
export declare function readBytes({ root, rel, kind }: Handle, limit: number): Uint8Array<ArrayBufferLike>;
/**
 * Bytes that are no UTF-8 are refused, never turned into U+FFFD, so a text written back by
 * files.update holds what the file held.
 *
 * @param file - the file the bytes came from
 * @param bytes - its bytes
 * @returns its text, a byte order mark kept
 * @throws a refusal STORED_INVALID for bytes that are no UTF-8
 */
export declare function textOf(file: Handle, bytes: Uint8Array): string;
