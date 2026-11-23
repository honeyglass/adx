// STAYS ORIKO'S OWN CODE. adx cannot do this yet (adx TODO #6), so read migrates last.
//
// A source of read is a file the person names, anywhere on the disk, or an https address the
// person names. adx reads a file only inside a root (`inFile(root)`) and talks only to a server
// the tool declares (`remote(...)`), so neither fits:
// - the file: read through node:fs, up to FILE_LIMITS.readBytes, relative to the working directory
// - the address: https only, no port, user or password, a public address after every redirect,
//   at most READ_LIMITS.redirects redirects and READ_LIMITS.downloadSeconds seconds
// - the text: a PDF, a Word file, an HTML page or UTF-8 text, cleaned to Markdown
// What follows from it: the test kit cannot fake the download, and adx cannot promise that a
// dry run of read sends nothing. oriko's own tests keep both, with its fake web.
//
// What goes through adx needs no try. This code goes around adx, so it handles its expected
// errors itself, with $try and no try block (adx decision 76).
import { readFile } from 'node:fs/promises';
import { failed } from '@honeyglass/adx';
import { $try } from '@honeyglass/utils/ts';
import type { Issues } from '../core/issues.ts';
import * as issue from './issues.ts';

export type Role = 'posting' | 'notes' | 'resume';
type Input = { role: Role; source: string };
type Read = {
  kind: 'pdf' | 'docx' | 'html' | 'text';
  text: string;
  /** How many characters the cleaning replaced. */
  replaced: number;
};
/** One document, with the file or the address as the call names it. */
export type Document = Input & Read;

const isMissing = (error: Error) => 'code' in error && error.code === 'ENOENT';

/** The download of an https address, with its checks. Its issues stand at the option of the source. */
declare function download(input: Input): Promise<Uint8Array | Issues<Role>>;
/** The text of a PDF, a Word file, an HTML page or UTF-8 text. A parser throws for a broken document. */
declare function textOf(bytes: Uint8Array): Promise<Read>;

// A source with a scheme is downloaded, anything else is a file.
async function bytesOf(input: Input): Promise<Uint8Array | Issues<Role>> {
  const { role, source } = input;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(source)) return download(input);
  const read = await $try(readFile(source));
  if (read.error === null) return read.data;
  // A missing file is the caller's mistake. Any other error of the read is for the person:
  // adx sorts it into a kind, and the error stays whole as the cause.
  if (isMissing(read.error)) return [issue.noSource.at(role, `There is no file ${source}`)];
  throw failed('Nothing was written.', read.error);
}

async function documentOf(input: Input): Promise<Document | Issues<Role>> {
  const bytes = await bytesOf(input);
  if (Array.isArray(bytes)) return bytes;
  // A broken or encrypted document is an expected failure of this input, not a bug.
  const read = await $try(textOf(bytes));
  if (read.error !== null)
    return [
      issue.unreadable.at(input.role, `${input.source} is broken, encrypted or cannot be opened`),
    ];
  return { ...input, ...read.data };
}

/**
 * Every document of one call, read and turned into text, or every issue of every source, each
 * at the option that names the source.
 */
export async function documentsOf(sources: {
  posting: string | undefined;
  notes: string[];
  resume: string | undefined;
}): Promise<{ documents: Document[] } | Issues<Role>> {
  const inputs: Input[] = [
    ...(sources.posting === undefined
      ? []
      : [{ role: 'posting' as const, source: sources.posting }]),
    ...sources.notes.map(source => ({ role: 'notes' as const, source })),
    ...(sources.resume === undefined ? [] : [{ role: 'resume' as const, source: sources.resume }]),
  ];
  const read = await Promise.all(inputs.map(documentOf));
  const [first, ...more] = read.flatMap(one => (Array.isArray(one) ? one : []));
  if (first !== undefined) return [first, ...more];
  return { documents: read.flatMap(one => (Array.isArray(one) ? [] : [one])) };
}

/** The posting as Markdown, headed by where it came from. */
export declare function postingText(posting: Document): string;
/** The notes a CV has, with one section per new note, headed by its source. */
export declare function notesText(before: string, notes: Document[]): string;
