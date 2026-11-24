/**
 * The files the test kit reads and keeps: the skill it reads, and the fingerprints of the stored
 * kinds it reads and writes next to the tool's package.json.
 *
 * textAt, keep, digestOf: the start of a file's text, a text written whole, and the digest of a
 * text.
 *
 * @example const head = textAt(join(folder, 'SKILL.md'), 4096);
 */
import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readSync, statSync, writeFileSync } from 'node:fs';
/** @returns the first bytes of the file up to the limit, as text, or undefined for no file */
export function textAt(path, limit) {
    if (existsSync(path) === false || statSync(path).isFile() === false)
        return undefined;
    const fd = openSync(path, 'r');
    const bytes = new Uint8Array(limit);
    const read = readSync(fd, bytes, 0, limit, 0);
    closeSync(fd);
    return new TextDecoder().decode(bytes.subarray(0, read));
}
export const keep = (path, text) => writeFileSync(path, text);
export const digestOf = (text) => createHash('sha256').update(text).digest('hex');
