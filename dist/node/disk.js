/**
 * The file system of the call, as node:fs and node:path give it.
 *
 * disk: the port files/ reads and writes through.
 *
 * Every call is synchronous, as decision 20's commit is: a write that is cut by a signal stops
 * between two calls, never inside one. A missing path answers undefined, where Node's error says
 * ENOENT or ENOTDIR; any other system error is thrown as Node raised it, with its syscall, path
 * and code, so the caller keeps it as the cause. A read opens with O_NOFOLLOW, so it never opens
 * a link, and a temporary file is created with O_EXCL beside its target, so the rename stays on
 * one file system.
 *
 * @example const bytes = disk.read('/home/ada/.hello/friends/ada.json', 65_536);
 */
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { closeSync, constants, fchmodSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readSync, realpathSync, renameSync, rmdirSync, rmSync, statSync, writeSync, } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { trySync$ } from '@honeyglass/utils/ts';
export const disk = {
    isAbsolute,
    join: (folder, rel) => join(folder, ...rel.split('/')),
    parent: dirname,
    real: path => missingAsUndefined(() => realpathSync.native(path)),
    within(path, folder) {
        const rel = relative(folder, path);
        return (rel === '' ||
            (rel !== '..' && rel.startsWith(`..${sep}`) === false && isAbsolute(rel) === false));
    },
    entry: path => {
        const stats = missingAsUndefined(() => lstatSync(path));
        return stats === undefined ? undefined : entryOf(stats);
    },
    read,
    names: folder => readdirSync(folder).sort(),
    mode: path => statSync(path).mode & 0o777,
    size: path => statSync(path).size,
    makeFolder: (path, mode) => mkdirSync(path, { mode }),
    removeFolder: rmdirSync,
    stage,
    move: renameSync,
    remove: path => rmSync(path, { force: true }),
    encode: text => new TextEncoder().encode(text),
    decode,
};
function entryOf(stats) {
    if (stats.isSymbolicLink())
        return 'link';
    if (stats.isFile())
        return 'file';
    return stats.isDirectory() ? 'folder' : 'other';
}
// The file is read to one byte past the limit, so a larger one is told without reading it all.
// The caller checked the path before this open, and another program can swap a folder of it for
// a link between the two; decision 20 closes that with the lock of a root (TODO #3).
function read(path, limit) {
    const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const { data, error } = trySync$(() => readUpTo(fd, limit));
    closeSync(fd);
    if (error !== null)
        throw error;
    return data;
}
// To the end of the file, which may have grown since its size was read: never cut.
function readUpTo(fd, limit) {
    if (fstatSync(fd).size > limit)
        return undefined;
    const chunks = [];
    let length = 0;
    while (length <= limit) {
        const chunk = new Uint8Array(Math.min(CHUNK, limit + 1 - length));
        const got = readSync(fd, chunk, 0, chunk.length, null);
        if (got === 0)
            return joined(chunks, length);
        chunks.push(chunk.subarray(0, got));
        length += got;
    }
    return undefined;
}
function joined(chunks, length) {
    const bytes = new Uint8Array(length);
    let at = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, at);
        at += chunk.length;
    }
    return bytes;
}
// A text whose bytes are no UTF-8 has none; a byte order mark stays, so the text writes back whole.
function decode(bytes) {
    const text = trySync$(() => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes));
    return text.error === null ? text.data : undefined;
}
// A temporary name no other call picks, hidden beside the target; removed when the write fails.
// It does not hold the name of the target, so it fits wherever the target's name fits.
function stage(path, bytes, mode) {
    const temp = join(dirname(path), `.${randomUUID()}.adx-tmp`);
    const fd = openSync(temp, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL, mode);
    const { error } = trySync$(() => written(fd, bytes, mode));
    closeSync(fd);
    if (error === null)
        return temp;
    rmSync(temp, { force: true });
    throw error;
}
// The mode is set again, since the umask of the process takes bits from the one open gives.
function written(fd, bytes, mode) {
    for (let done = 0; done < bytes.length;)
        done += writeSync(fd, bytes, done);
    fchmod(fd, mode);
    fsyncSync(fd);
}
function fchmod(fd, mode) {
    if (process.platform !== 'win32')
        fchmodSync(fd, mode);
}
/** Sixty-four KiB, the most one read takes, so a large limit allocates no more than the file. */
const CHUNK = 65_536;
/** The codes of a path that is not there: a definition, from Node's common system errors. */
const MISSING = new Set(['ENOENT', 'ENOTDIR']);
function missingAsUndefined(work) {
    const { data, error } = trySync$(work);
    if (error === null)
        return data;
    if ('code' in error && typeof error.code === 'string' && MISSING.has(error.code))
        return undefined;
    throw error;
}
