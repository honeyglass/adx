// STAYS ORIKO'S OWN CODE, like read/sources.ts, until adx TODO #6 settles "a file the person
// names".
//
// The picture of photo set is a file the person names, anywhere on the disk, as today. adx reads
// a file only inside a root (`inFile(root)`), and the working directory is too narrow a root for
// a picture that lies in ~/Pictures. A candidate in TODO #6 is an allow-list of folders the person
// opens. Until then oriko reads the picture through node:fs.
//
// What goes through adx needs no try. This code goes around adx, so it handles its expected
// errors itself, with $try and trySync$ and no try block (adx decision 76).
import { readFile } from 'node:fs/promises';
import { failed } from '@honeyglass/adx';
import { $try, trySync$ } from '@honeyglass/utils/ts';
import type { Issues } from '../core/issues.ts';
import * as issue from './issues.ts';

const isMissing = (error: Error) => 'code' in error && error.code === 'ENOENT';

/** Any PNG or JPEG as the square PNG the CV uses. It throws for bytes that are no picture. */
declare function squared(photo: Uint8Array): Uint8Array;

/**
 * @param path - the picture the person names
 * @returns the square PNG, or the issue at `file`: no such file, or no picture
 */
export async function squarePhoto(path: string): Promise<Uint8Array | Issues<'file'>> {
  const read = await $try(readFile(path));
  if (read.error !== null) {
    // A missing file is the caller's mistake. Any other error of the read, such as a missing
    // right, is for the person: adx sorts it into a kind, and the error stays whole as the cause.
    if (isMissing(read.error)) return [issue.noPicture.at('file', `There is no file ${path}`)];
    throw failed('Nothing was written.', read.error);
  }
  // Only bytes that decode as a picture are stored, whatever the file is called. Decoding is
  // synchronous and throws, so trySync$ takes the error.
  const square = trySync$(() => squared(read.data));
  return square.error === null ? square.data : [issue.photoUnreadable.at('file')];
}
