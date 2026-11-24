/**
 * The types of roots and files, as proto/adx/index.d.ts declares them, and the ports to them.
 *
 * File, Dir, Root, RootSource: a file, a folder and a root as a handler reads them.
 * Stored: a kind of stored data, as File.json takes it; stored/ makes it.
 * Changes, Written, Files: what a write changes, what it answers, and the writes of a plan.
 * Writer: the writes of one call, which the tool hands a command: the check of the paths its
 * input names, the files of its plan, and the commit after it.
 * shownAs, pathOf: a file or folder adx made, by its path as adx shows it, and that path.
 *
 * The types stand in core/, since command/ types the plan of an effect with Files, and files/
 * makes the values.
 *
 * @example const written: Written = files.write(file, text);
 */
import type { z } from 'zod';
import type { Issue } from './issue.ts';

export interface Stored<T, Oldest = T> {
  readonly name: string;
  readonly version: number;
  from<S extends z.ZodType>(
    version: number,
    shape: S,
    up: (old: z.output<S>) => Oldest,
  ): Stored<T, z.output<S>>;
  stringify(value: T): string;
  parse(text: string): T;
}

export interface File {
  readonly rel: string;
  readonly exists: boolean;
  text(limit: number): Promise<string>;
  bytes(limit: number): Promise<Uint8Array>;
  json<T>(limit: number, shape: Stored<T, any>): Promise<T>;
  json<S extends z.ZodType>(limit: number, shape: S): Promise<z.output<S>>;
}

export interface Dir {
  readonly rel: string;
  walk(suffix?: string): AsyncIterable<File>;
}

export interface Root {
  readonly name: string;
  file(rel: string): File;
  list(folder: string, suffix: string): Promise<(File & { stem: string })[]>;
}

export interface RootSource {}

export interface Changes {
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
  readonly more: number;
}

export interface Written {
  readonly file: string;
  readonly bytes: number;
  readonly replaces: boolean;
  readonly unchanged?: true;
  readonly changes?: Changes;
}

export interface Files {
  write(file: File, data: string | Uint8Array, options?: { mode?: number }): Written;
  update(file: File, limit: number, change: (old: string) => string): Promise<Written>;
}

const paths = new WeakMap<object, string>();

/** Marks a file or folder adx made, so a step writes its path cleaned, relative to its root. */
export const shownAs = (handle: File | Dir) => void paths.set(handle, handle.rel);

/** @returns the path of a file or folder adx made, or undefined for any other value */
export const pathOf = (value: unknown) =>
  typeof value === 'object' && value !== null ? paths.get(value) : undefined;

export interface Writer {
  /** One issue per path of the input that leaves its root or names the wrong kind of entry. */
  paths(input: unknown): Promise<Issue[]>;
  readonly files: Files;
  /** How many writes the plan staged with files.write, for --replace (decision 47). */
  readonly writes: number;
  /** How many files the plan staged, by write and by update. */
  readonly staged: number;
  /** Writes every staged file, all or none; a refusal of a failed write says what it left. */
  commit(): Promise<void>;
  /** Each file the commit wrote, by its path in its root; none before it ended. */
  written(): readonly string[];
}
