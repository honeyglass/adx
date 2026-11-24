/**
 * Where a path of a root leads, checked where the file is opened: the security boundary of files.
 *
 * Found, found: what a read finds at a path, by its real place inside the root.
 * Target, target: where a write puts a file, and the folders it makes first.
 * kindIssue: the issue of a path of the input that names the wrong kind of entry.
 * cleaned: a path as adx shows it, relative to its root.
 * openedOrThrown: a result, or its issue thrown as a refusal.
 * checked: a read of the disk, its system error answered as a refusal.
 *
 * A path may open only what lies inside the real folder of its root: the property checked is the
 * real path, every link followed, so `..`, an absolute path and a link out of the root fail
 * alike, whatever their form. A write follows a link at its target only to a file inside the
 * root; any other link the rename replaces, so nothing is written out of the root. A root that is
 * not there yet holds nothing.
 *
 * @example const at = openedOrThrown(found(home, 'friends/ada.json'));
 */
import { shown, trySync$ } from '@honeyglass/utils/ts';
import { fileNotFound, Issue, notAFile, notAFolder, NOTHING_CHANGED, pathOutside, Refused, refusedOf, refusedWith, schemaFailed, } from "../core/index.js";
import { NAME_BYTES } from "./limits.js";
import { located } from "./located.js";
/**
 * @param root - the root of the path
 * @param rel - the path as the caller or the author wrote it
 * @returns what stands there, or PATH_OUTSIDE
 * @throws a refusal of a root that is not there, or of a system error
 */
export function found(root, rel) {
    return checked(() => {
        const parts = partsOf(rel);
        if (parts === undefined)
            return outside(root, rel);
        const long = tooLong(rel, parts);
        if (long !== undefined)
            return long;
        const at = { rel: parts.join('/') || '.' };
        const { disk } = located();
        const folder = located().folderOf(root).folder;
        const realRoot = disk.real(folder);
        const real = realRoot === undefined ? undefined : disk.real(disk.join(folder, at.rel));
        if (realRoot === undefined || real === undefined)
            return { ...at, real: undefined };
        if (disk.within(real, realRoot) === false)
            return outside(root, rel);
        return { ...at, real, entry: disk.entry(real) ?? 'other' };
    });
}
/**
 * @param root - the root of the path
 * @param rel - the path of the file to write
 * @returns the place of the file, or PATH_OUTSIDE, NOT_A_FOLDER or NOT_A_FILE
 * @throws a refusal of a root that is not there, or of a system error
 */
export function target(root, rel) {
    return checked(() => {
        const parts = partsOf(rel);
        if (parts === undefined)
            return outside(root, rel);
        if (parts.length === 0)
            return notAFile.issue(`${shown(rel)} is the folder of the root`);
        const long = tooLong(rel, parts);
        if (long !== undefined)
            return long;
        const { disk } = located();
        const folder = located().folderOf(root).folder;
        const realRoot = disk.real(folder);
        if (realRoot === undefined) {
            const folders = [...missingAbove(folder), ...below(folder, parts.slice(0, -1))];
            return {
                rel: parts.join('/'),
                path: disk.join(folder, parts.join('/')),
                entry: undefined,
                folders,
            };
        }
        const { base, depth } = deepest(folder, realRoot, parts);
        if (disk.within(base, realRoot) === false)
            return outside(root, rel);
        if (disk.entry(base) !== 'folder') {
            const stands = shown(parts.slice(0, depth).join('/'));
            return notAFolder.issue(`${shown(rel)} goes through ${stands}, which is no folder`);
        }
        const folders = below(base, parts.slice(depth, -1));
        const path = disk.join(base, parts.slice(depth).join('/'));
        const entry = folders.length === 0 ? disk.entry(path) : undefined;
        if (entry === 'folder' || entry === 'other') {
            return notAFile.issue(`${shown(rel)} is a folder, not a file`);
        }
        const linked = entry === 'link' ? linkedFile(path, realRoot) : undefined;
        if (linked !== undefined)
            return { rel: parts.join('/'), path: linked, entry: 'file', folders };
        return { rel: parts.join('/'), path, entry, folders };
    });
}
/**
 * @param root - the root of the path
 * @param rel - a path of the input
 * @param kind - what the field takes: a file to read, a file to write, or a folder
 * @returns the issue of the path, or undefined when it names what the field takes
 */
export function kindIssue(root, rel, kind) {
    if (kind === 'out') {
        const to = target(root, rel);
        return to instanceof Issue ? to : undefined;
    }
    const at = found(root, rel);
    if (at instanceof Issue)
        return at;
    const name = shown(rel);
    if (at.real === undefined)
        return fileNotFound.issue(`${name} is not in the root ${root.name}`);
    if (kind === 'dir' && at.entry !== 'folder')
        return notAFolder.issue(`${name} is no folder`);
    if (kind === 'in' && at.entry !== 'file')
        return notAFile.issue(`${name} is no file`);
    return undefined;
}
/**
 * @param at - what a function of this file answered
 * @returns the result
 * @throws its issue as a refusal; nothing was changed, since files change only after plan
 */
export function openedOrThrown(at) {
    if (at instanceof Issue)
        throw refusedWith([at], NOTHING_CHANGED);
    return at;
}
/**
 * A system error of the disk, such as a folder without the right to read it, is the person's.
 *
 * @param work - reads of the disk before anything is written
 * @returns what the work answers
 * @throws its refusal as it came, and any other error as a refusal that changed nothing
 */
export function checked(work) {
    const { data, error } = trySync$(work);
    if (error === null)
        return data;
    if (error instanceof Refused)
        throw error;
    throw refusedOf(error, NOTHING_CHANGED);
}
/**
 * @param rel - a path relative to its root, with `/` between its parts
 * @returns its parts without `.` and empty ones, `..` taken back; undefined for an absolute
 * path, one that climbs above its root, and one that holds a NUL or a backslash
 */
function partsOf(rel) {
    if (rel.startsWith('/') || /[\0\\]/.test(rel))
        return undefined;
    const parts = [];
    for (const part of rel.split('/')) {
        if (part === '' || part === '.')
            continue;
        if (part !== '..')
            parts.push(part);
        else if (parts.pop() === undefined)
            return undefined;
    }
    return parts;
}
/**
 * @param rel - a path relative to its root
 * @returns the path cleaned, `.` and empty parts left out and `..` taken back, or the path as
 * written when it leaves its root, so its issue names it
 */
export function cleaned(rel) {
    const parts = partsOf(rel);
    return parts === undefined ? rel : parts.join('/') || '.';
}
// A name longer than a file system holds fails the rename of the real run, after the dry run
// passed, so the plan refuses it: the agent can pick a shorter one.
function tooLong(rel, parts) {
    const { disk } = located();
    const long = parts.find(part => disk.encode(part).length > NAME_BYTES);
    if (long === undefined)
        return undefined;
    return schemaFailed.issue(`${shown(rel)} holds a name of more than ${NAME_BYTES} bytes`);
}
// A link inside the root to a file inside it is written through to that file, so the link stays
// and the file keeps its mode; any other link is replaced by the write.
function linkedFile(path, realRoot) {
    const { disk } = located();
    const real = disk.real(path);
    if (real === undefined || disk.within(real, realRoot) === false)
        return undefined;
    return disk.entry(real) === 'file' ? real : undefined;
}
const outside = (root, rel) => pathOutside.issue(`${shown(rel)} leads out of the root ${root.name}`);
// The deepest folder of the path that stands, its links followed, and how many parts lead to it.
function deepest(folder, realRoot, parts) {
    const { disk } = located();
    for (let depth = parts.length - 1; depth > 0; depth -= 1) {
        const base = disk.real(disk.join(folder, parts.slice(0, depth).join('/')));
        if (base !== undefined)
            return { base, depth };
    }
    return { base: realRoot, depth: 0 };
}
// The folders of the path below a folder, each one deeper, from the top down.
function below(folder, parts) {
    const { disk } = located();
    return parts.map((_, i) => disk.join(folder, parts.slice(0, i + 1).join('/')));
}
// A root that is not there, and every folder above it that is not there either, from the top.
function missingAbove(folder) {
    const { disk } = located();
    const parent = disk.parent(folder);
    if (parent === folder || disk.real(parent) !== undefined)
        return [folder];
    return [...missingAbove(parent), folder];
}
