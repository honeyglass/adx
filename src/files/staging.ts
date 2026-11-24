/**
 * The writes of one call: the paths its input names, the files its plan stages, and the commit.
 *
 * Replace, staging: what the command says about replacing, and the writes of one call.
 *
 * A plan stages; nothing is written before it returns, and nothing on a dry run. A write of the
 * same bytes, and an update that answers the same text, stage nothing (decision 81). Every staged
 * file is written whole beside its place, then all are renamed one after another: a failure before
 * the first rename leaves nothing, and one after it names the files already moved (rule 9). A
 * rename replaces a link at the target; no file is ever written through a link.
 *
 * @example const writer = staging({ replace: spec.replace, replacing: run.replace, retry });
 */
import { shown, trySync$ } from '@honeyglass/utils/ts';
import {
  alreadyExists,
  atField,
  declaration,
  NOTHING_CHANGED,
  Refused,
  refusedOf,
  refusedWith,
  withHint,
} from '../core/index.ts';
import type { File, Files, Issue, Path, Step, Writer, Written } from '../core/index.ts';
import { changesOf } from './changes.ts';
import { Handle, readBytes, textOf, Tree } from './handle.ts';
import { CHANGES_BYTES, FILE_MODE, FOLDER_MODE } from './limits.ts';
import { located } from './located.ts';
import { checked, kindIssue, openedOrThrown, target } from './paths.ts';
import type { Target } from './paths.ts';

/**
 * `replace` is what the command declares; `replacing` whether the call said --replace; `retry`
 * the call again with --replace --dry-run, for the issue of a taken file.
 */
export type Replace = {
  replace: false | 'always' | undefined;
  replacing: boolean;
  retry: () => Step;
};

type Staged = {
  rel: string;
  path: string;
  folders: readonly string[];
  bytes: Uint8Array;
  mode: number;
};

/** @param call - what the command and the call say about replacing */
export const staging = (call: Replace): Writer => new Staging(call);

class Staging implements Writer {
  writes = 0;
  readonly files: Files;
  readonly #call: Replace;
  readonly #staged: Staged[] = [];
  /** The temporary files the commit made, in the order of the staged files. */
  readonly #temps: string[] = [];
  /** Every path the plan wrote or met unchanged, each once. */
  readonly #paths = new Set<string>();
  /** The place in the input of each handle the input holds, for the issues of its file. */
  readonly #fields = new Map<object, Path<string>>();
  #committed = false;

  constructor(call: Replace) {
    this.#call = call;
    this.files = {
      write: (file, data, options) => this.#atField(file, () => this.#write(file, data, options)),
      update: async (file, limit, change) =>
        this.#atField(file, () => this.#update(file, limit, change)),
    };
  }

  get staged() {
    return this.#staged.length;
  }

  written() {
    return this.#committed ? this.#staged.map(staged => staged.rel) : [];
  }

  async paths(input: unknown) {
    const issues: Issue[] = [];
    for (const [value, path] of handlesIn(input, [])) {
      this.#fields.set(value, path);
      const kind = value instanceof Tree ? 'dir' : value.kind;
      if (kind === 'plain') continue;
      const issue = kindIssue(value.root, value.rel, kind);
      if (issue !== undefined) issues.push(atField(issue, path));
    }
    return issues;
  }

  async commit() {
    const made: string[] = [];
    const failed = (error: unknown) => {
      const left = [...removed(this.#temps), ...unmade(made)];
      return refusedOf(error, `${NOTHING_CHANGED} ${leftText(left, this.#temps.length)}`);
    };
    const { disk } = located();
    for (const folder of this.#staged.flatMap(staged => staged.folders)) {
      if (disk.entry(folder) !== undefined) continue;
      const making = trySync$(() => disk.makeFolder(folder, FOLDER_MODE));
      if (making.error !== null) throw failed(making.error);
      made.push(folder);
    }
    for (const staged of this.#staged) {
      const temp = trySync$(() => disk.stage(staged.path, staged.bytes, staged.mode));
      // The failed one removed its own temporary file, and counts among those removed.
      if (temp.error !== null) {
        this.#temps.push('');
        throw failed(temp.error);
      }
      this.#temps.push(temp.data);
    }
    for (const [i, staged] of this.#staged.entries()) {
      const temp = this.#temps[i] ?? '';
      const moved = trySync$(() => disk.move(temp, staged.path));
      if (moved.error === null) continue;
      if (i === 0) throw failed(moved.error);
      const rest = this.#temps.slice(i);
      const left = leftText(removed(rest), rest.length);
      throw refusedOf(moved.error, `${movedText(this.#staged, i)} ${left}`);
    }
    this.#committed = true;
  }

  #write(file: File, data: string | Uint8Array, options: { mode?: number } = {}): Written {
    const at = handleOf(file);
    const to = this.#once(openedOrThrown(target(at.root, at.rel)));
    const { disk } = located();
    const bytes = typeof data === 'string' ? disk.encode(data) : data;
    const written = { file: to.rel, bytes: bytes.length };
    this.writes += 1;
    if (to.entry === 'file' && checked(() => sameAsFile(to.path, bytes))) {
      return { ...written, replaces: false, unchanged: true };
    }
    if (to.entry === undefined) {
      this.#staged.push({ ...to, bytes, mode: options.mode ?? FILE_MODE });
      return { ...written, replaces: false };
    }
    if (this.#mayReplace() === false) throw this.#taken(to.rel);
    const mode =
      options.mode ?? (to.entry === 'file' ? checked(() => disk.mode(to.path)) : FILE_MODE);
    this.#staged.push({ ...to, bytes, mode });
    const before = to.entry === 'file' ? checked(() => changedText(to.path)) : '';
    const changes = changesOf(before, disk.decode(bytes), to.rel);
    return { ...written, replaces: true, changes };
  }

  // A file to change must stand and hold UTF-8 text; its mode stays (decision 17).
  #update(file: File, limit: number, change: (old: string) => string): Written {
    const at = handleOf(file);
    const old = readBytes(at, limit);
    const text = textOf(at, old);
    const next = change(text);
    const { disk } = located();
    const bytes = disk.encode(next);
    const to = this.#once(openedOrThrown(target(at.root, at.rel)));
    const written = { file: to.rel, bytes: bytes.length };
    if (sameBytes(old, bytes)) return { ...written, replaces: false, unchanged: true };
    const mode = to.entry === 'file' ? checked(() => disk.mode(to.path)) : FILE_MODE;
    this.#staged.push({ ...to, bytes, mode });
    return { ...written, replaces: true, changes: changesOf(text, next, to.rel) };
  }

  // Two writes of one file in one plan would leave it to their order which one stays.
  #once(to: Target) {
    if (this.#paths.has(to.path) === false) {
      this.#paths.add(to.path);
      return to;
    }
    const issue = declaration.issue(`the plan writes ${shown(to.rel)} twice`);
    throw refusedWith([issue], NOTHING_CHANGED);
  }

  #mayReplace() {
    const { replace, replacing } = this.#call;
    return replace === 'always' || (replace === undefined && replacing);
  }

  // The command with --replace --dry-run shows what the replace would lose (decision 31).
  #taken(rel: string) {
    const takes = this.#call.replace === undefined;
    const hint = takes ? `add --replace to overwrite ${rel}` : 'pick another name';
    const issue = withHint(alreadyExists.issue(`${shown(rel)} exists and holds other bytes`), hint);
    return refusedWith([takes ? issue.command(this.#call.retry()) : issue], NOTHING_CHANGED);
  }

  // A refusal of a file the input named stands at its field. Any other error, such as a bug in
  // the function of an update, flies on as it came.
  #atField<T>(file: File, work: () => T): T {
    const { data, error } = trySync$(work);
    if (error === null) return data;
    const path = this.#fields.get(file);
    if (error instanceof Refused === false || path === undefined) throw error;
    const issues = error.issues.map(issue =>
      issue.path === undefined ? atField(issue, path) : issue,
    );
    const [first, ...rest] = issues;
    if (first === undefined) throw error;
    throw refusedWith([first, ...rest], NOTHING_CHANGED, error);
  }
}

/** @throws a bug refusal, DECLARATION, for a file no root of adx made */
function handleOf(file: File) {
  if (file instanceof Handle) return file;
  const issue = declaration.issue('a write names a file that no root of adx made');
  throw refusedWith([issue], NOTHING_CHANGED);
}

// Each handle the input holds, at any depth, with its place: the field first.
function* handlesIn(
  value: unknown,
  path: (string | number)[],
): Generator<[Handle | Tree, Path<string>]> {
  const [field, ...below] = path;
  if ((value instanceof Handle || value instanceof Tree) && typeof field === 'string') {
    yield [value, [field, ...below]];
    return;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) yield* handlesIn(item, [...path, index]);
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, item] of Object.entries(value)) yield* handlesIn(item, [...path, key]);
}

// The sizes first, so a large file of another size is never read.
function sameAsFile(path: string, bytes: Uint8Array) {
  const { disk } = located();
  if (disk.size(path) !== bytes.length) return false;
  const old = disk.read(path, bytes.length);
  return old !== undefined && sameBytes(old, bytes);
}

// The text a replace compares with: none for a file past CHANGES_BYTES or of bytes no UTF-8.
function changedText(path: string) {
  const { disk } = located();
  const old = disk.read(path, CHANGES_BYTES);
  return old === undefined ? undefined : disk.decode(old);
}

const sameBytes = (a: Uint8Array, b: Uint8Array) =>
  a.length === b.length && a.every((byte, i) => byte === b[i]);

// Each temporary file removed; those that could not be removed are answered. A failed stage has
// no name: it removed its own.
function removed(temps: readonly string[]) {
  const { disk } = located();
  return temps.filter(temp => temp !== '' && trySync$(() => disk.remove(temp)).error !== null);
}

// The folders the commit made, the deepest first, so "Nothing was changed" holds.
function unmade(folders: readonly string[]) {
  const { disk } = located();
  return [...folders]
    .reverse()
    .filter(folder => trySync$(() => disk.removeFolder(folder)).error !== null);
}

function leftText(left: readonly string[], tried: number) {
  if (left.length > 0) return `Left behind: ${left.map(shown).join(', ')}.`;
  if (tried === 0) return 'No temporary file is left.';
  return tried === 1 ? 'The temporary file was removed.' : 'The temporary files were removed.';
}

function movedText(staged: readonly Staged[], failed: number) {
  if (failed === 0) return NOTHING_CHANGED;
  const names = (list: readonly Staged[]) => list.map(({ rel }) => shown(rel)).join(', ');
  return `Moved in: ${names(staged.slice(0, failed))}. Not moved: ${names(staged.slice(failed))}.`;
}
