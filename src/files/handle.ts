/**
 * A file and a folder of a root, as a handler reads them.
 *
 * Handle, handle: a file of a root, from root.file(), from a path of the input, or from a walk.
 * Tree, tree: a folder of a root, from a path of the input.
 * listed: the files of one folder of a root whose names end in a suffix, for root.list().
 * readBytes, textOf: the bytes of a file, at most a limit, and their text, for a read and for
 * files.update.
 *
 * A handle holds its root and its path, and finds the file only when it is used, inside the call
 * that runs. Every read takes a limit: a file past it is refused, never cut, since a cut text
 * written back by files.update would lose the rest. A walk and a list follow no link.
 *
 * @example const text = await home.file('notes.txt').text(4096);
 */
import { shown, trySync$ } from '@honeyglass/utils/ts';
import type { z } from 'zod';
import {
  fileNotFound,
  inputTooLarge,
  notAFile,
  NOTHING_CHANGED,
  refusedOf,
  refusedWith,
  shownAs,
  storedInvalid,
} from '../core/index.ts';
import type { Dir, File, Issue, Root, Stored } from '../core/index.ts';
import { cleaned, found, openedOrThrown } from './paths.ts';
import { located } from './located.ts';

/** What the field of a handle takes; `plain` is a handle the author made, which no field checks. */
export type Kind = 'plain' | 'in' | 'out' | 'dir';

export class Handle implements File {
  readonly root: Root;
  readonly rel: string;
  readonly kind: Kind;

  constructor(root: Root, rel: string, kind: Kind) {
    this.root = root;
    this.rel = cleaned(rel);
    this.kind = kind;
    shownAs(this);
  }

  /** A file stands there; a folder, or nothing, is no file. */
  get exists() {
    const at = openedOrThrown(found(this.root, this.rel));
    return at.real !== undefined && at.entry === 'file';
  }

  async bytes(limit: number) {
    return readBytes(this, limit);
  }

  async text(limit: number) {
    return textOf(this, readBytes(this, limit));
  }

  json<T>(limit: number, shape: Stored<T, any>): Promise<T>;
  json<S extends z.ZodType>(limit: number, shape: S): Promise<z.output<S>>;
  async json(limit: number, shape: z.ZodType | Stored<unknown>) {
    const text = await this.text(limit);
    // A stored kind reads its own text, converting an older format.
    if (isStored(shape)) return shape.parse(text);
    const parsed = trySync$((): unknown => JSON.parse(text));
    if (parsed.error !== null) throw invalid(`${shown(this.rel)} holds no JSON`, parsed.error);
    const checked = shape.safeParse(parsed.data);
    if (checked.success) return checked.data;
    const [first] = checked.error.issues;
    const at = first?.path.join('.') ?? '';
    throw invalid(`${shown(this.rel)} fails its schema at ${shown(at)}: ${first?.message}`);
  }
}

export class Tree implements Dir {
  readonly root: Root;
  readonly rel: string;

  constructor(root: Root, rel: string) {
    this.root = root;
    this.rel = cleaned(rel);
    shownAs(this);
  }

  async *walk(suffix = ''): AsyncIterable<File> {
    const at = openedOrThrown(found(this.root, this.rel));
    if (at.real === undefined) return;
    yield* walked(this.root, at.rel, at.real, suffix);
  }
}

/** A handle for a path that leaves its root keeps the path as written, so its issue names it. */
export const handle = (root: Root, rel: string, kind: Kind) => new Handle(root, rel, kind);

export const tree = (root: Root, rel: string) => new Tree(root, rel);

/**
 * @param root - the root of the folder
 * @param folder - the folder, relative to the root
 * @param suffix - the end of every name listed, such as `.json`
 * @returns each file directly in the folder whose name ends in the suffix, by name, with its stem;
 * none when the folder is not there
 */
export function listed(root: Root, folder: string, suffix: string) {
  const at = openedOrThrown(found(root, folder));
  if (at.real === undefined || at.entry !== 'folder') return [];
  const { disk } = located();
  const real = at.real;
  return disk
    .names(real)
    .filter(name => name.endsWith(suffix) && name.length > suffix.length)
    .filter(name => disk.entry(disk.join(real, name)) === 'file')
    .map(name => {
      const stem = name.slice(0, name.length - suffix.length);
      return Object.assign(handle(root, joined(at.rel, name), 'plain'), { stem });
    });
}

/**
 * @param root - the root of the file
 * @param rel - the file, relative to the root
 * @param limit - the most bytes the file may hold
 * @returns its bytes
 * @throws a refusal FILE_NOT_FOUND, NOT_A_FILE, INPUT_TOO_LARGE, or of a system error
 */
export function readBytes({ root, rel, kind }: Handle, limit: number) {
  const at = openedOrThrown(found(root, rel));
  const name = shown(rel);
  if (at.real === undefined)
    throw refused(fileNotFound.issue(`${name} is not in the root ${root.name}`));
  if (at.entry !== 'file') throw refused(notAFile.issue(`${name} is no file`));
  const { disk } = located();
  const real = at.real;
  const read = trySync$(() => disk.read(real, limit));
  if (read.error !== null) throw refusedOf(read.error, NOTHING_CHANGED);
  if (read.data === undefined)
    throw refused(tooLarge(kind, `${name} holds more than ${limit} bytes`));
  return read.data;
}

/**
 * Bytes that are no UTF-8 are refused, never turned into U+FFFD, so a text written back by
 * files.update holds what the file held.
 *
 * @param file - the file the bytes came from
 * @param bytes - its bytes
 * @returns its text, a byte order mark kept
 * @throws a refusal STORED_INVALID for bytes that are no UTF-8
 */
export function textOf(file: Handle, bytes: Uint8Array) {
  const text = located().disk.decode(bytes);
  if (text !== undefined) return text;
  throw refused(storedInvalid.issue(`${shown(file.rel)} holds bytes that are no UTF-8 text`));
}

// A file the caller named is the caller's input; any other file is the tool's, which only the
// person can make smaller.
const tooLarge = (kind: Kind, message: string) =>
  kind === 'in' ? inputTooLarge.issue(message) : storedInvalid.issue(message);

// Each folder in the order of its names, its files before nothing, and no link followed.
async function* walked(root: Root, rel: string, real: string, suffix: string): AsyncIterable<File> {
  const { disk } = located();
  for (const name of disk.names(real)) {
    const path = disk.join(real, name);
    const entry = disk.entry(path);
    if (entry === 'folder') yield* walked(root, joined(rel, name), path, suffix);
    if (entry === 'file' && name.endsWith(suffix)) yield handle(root, joined(rel, name), 'plain');
  }
}

const joined = (rel: string, name: string) => (rel === '.' ? name : `${rel}/${name}`);

const refused = (issue: Issue) => refusedWith([issue], NOTHING_CHANGED);

// A Zod schema checks a value; a stored kind has no safeParse and reads the text itself.
const isStored = (shape: z.ZodType | Stored<unknown>): shape is Stored<unknown> =>
  'safeParse' in shape === false;

const invalid = (message: string, cause?: unknown) =>
  refusedWith([storedInvalid.issue(message)], NOTHING_CHANGED, cause);
