/**
 * The field schemas adx gives: paths inside a root, a safe name, and text with line breaks.
 *
 * dir, inFile, outFile: a path the caller writes, which a handler gets as a Dir or a File.
 * id: a name of letters, digits, `-` and `_`, safe in a path and in a URL.
 * multiline: a string that may hold line breaks and tabs, and no other control character.
 *
 * This is the one file of files/ that calls Zod. A path schema checks nothing itself: it only
 * makes the handle, and the call checks its path against the disk before plan or run, so the
 * check stands where the file is.
 *
 * @example const NoteIn = z.object({ file: outFile(home), text: multiline() });
 */
import { z } from 'zod';
import { MULTILINE } from '../core/index.ts';
import type { Dir, File, Root } from '../core/index.ts';
import { handle, tree } from './handle.ts';

/** An allow-list: a character not named here, such as `.` or `/`, can lead out of a folder. */
const ID = /^[A-Za-z0-9_-]+$/;

export function dir(root: Root): z.ZodType<Dir, string> {
  return z.string().transform(rel => tree(root, rel));
}

export function inFile(root: Root): z.ZodType<File, string> {
  return z.string().transform(rel => handle(root, rel, 'in'));
}

export function outFile(root: Root): z.ZodType<File, string> {
  return z.string().transform(rel => handle(root, rel, 'out'));
}

export function id() {
  return z.string().regex(ID, { error: 'an id holds letters, digits, - and _ only' });
}

/** A string that may hold line breaks; a plain z.string() takes one line. */
export function multiline() {
  return z.string().check(MULTILINE);
}
