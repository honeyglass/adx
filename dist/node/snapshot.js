/**
 * What a folder holds, so the test kit sees whether a call changed anything in its scratch folder.
 *
 * snapshot: every entry below a folder, by its path, with what tells it apart from another.
 * testFolder: the entries at the top of the working directory of the test's process, each by
 * its kind, size and time of change, which costs one read of the folder.
 *
 * A file stands as its mode and the digest of its bytes, a link as its target, and a folder as
 * its mode, so a write, a new mode, a new link and a new folder all show. A link is never followed.
 *
 * @example const before = snapshot(folder);
 */
import { createHash } from 'node:crypto';
import { lstatSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';
/** @returns each entry below the folder, by its path relative to it */
export function snapshot(folder) {
    const entries = readdirSync(folder, { recursive: true, encoding: 'utf8' }).sort();
    return new Map(entries.map(rel => [rel, entryOf(join(folder, rel))]));
}
function entryOf(path) {
    const stats = lstatSync(path);
    const mode = (stats.mode & 0o777).toString(8);
    if (stats.isSymbolicLink())
        return `link to ${readlinkSync(path)}`;
    if (stats.isDirectory())
        return `folder ${mode}`;
    return `file ${mode} ${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
}
/** @returns each entry at the top of the working directory of the process */
export function testFolder() {
    const folder = process.cwd();
    const names = readdirSync(folder).sort();
    return new Map(names.map(name => {
        const stats = lstatSync(join(folder, name));
        return [name, `${stats.isDirectory() ? 'folder' : 'file'} ${stats.size} ${stats.mtimeMs}`];
    }));
}
