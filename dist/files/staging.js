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
import { alreadyExists, atField, declaration, NOTHING_CHANGED, Refused, refusedOf, refusedWith, withHint, } from "../core/index.js";
import { changesOf } from "./changes.js";
import { Handle, readBytes, textOf, Tree } from "./handle.js";
import { CHANGES_BYTES, FILE_MODE, FOLDER_MODE } from "./limits.js";
import { located } from "./located.js";
import { checked, kindIssue, openedOrThrown, target } from "./paths.js";
/** @param call - what the command and the call say about replacing */
export const staging = (call) => new Staging(call);
class Staging {
    writes = 0;
    files;
    #call;
    #staged = [];
    /** The temporary files the commit made, in the order of the staged files. */
    #temps = [];
    /** Every path the plan wrote or met unchanged, each once. */
    #paths = new Set();
    /** The place in the input of each handle the input holds, for the issues of its file. */
    #fields = new Map();
    constructor(call) {
        this.#call = call;
        this.files = {
            write: (file, data, options) => this.#atField(file, () => this.#write(file, data, options)),
            update: async (file, limit, change) => this.#atField(file, () => this.#update(file, limit, change)),
        };
    }
    async paths(input) {
        const issues = [];
        for (const [value, path] of handlesIn(input, [])) {
            this.#fields.set(value, path);
            const kind = value instanceof Tree ? 'dir' : value.kind;
            if (kind === 'plain')
                continue;
            const issue = kindIssue(value.root, value.rel, kind);
            if (issue !== undefined)
                issues.push(atField(issue, path));
        }
        return issues;
    }
    async commit() {
        const made = [];
        const failed = (error) => {
            const left = [...removed(this.#temps), ...unmade(made)];
            return refusedOf(error, `${NOTHING_CHANGED} ${leftText(left, this.#temps.length)}`);
        };
        const { disk } = located();
        for (const folder of this.#staged.flatMap(staged => staged.folders)) {
            if (disk.entry(folder) !== undefined)
                continue;
            const making = trySync$(() => disk.makeFolder(folder, FOLDER_MODE));
            if (making.error !== null)
                throw failed(making.error);
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
            if (moved.error === null)
                continue;
            if (i === 0)
                throw failed(moved.error);
            const rest = this.#temps.slice(i);
            const left = leftText(removed(rest), rest.length);
            throw refusedOf(moved.error, `${movedText(this.#staged, i)} ${left}`);
        }
    }
    #write(file, data, options = {}) {
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
        if (this.#mayReplace() === false)
            throw this.#taken(to.rel);
        const mode = options.mode ?? (to.entry === 'file' ? checked(() => disk.mode(to.path)) : FILE_MODE);
        this.#staged.push({ ...to, bytes, mode });
        const before = to.entry === 'file' ? checked(() => changedText(to.path)) : '';
        const changes = changesOf(before, disk.decode(bytes), to.rel);
        return { ...written, replaces: true, changes };
    }
    // A file to change must stand and hold UTF-8 text; its mode stays (decision 17).
    #update(file, limit, change) {
        const at = handleOf(file);
        const old = readBytes(at, limit);
        const text = textOf(at, old);
        const next = change(text);
        const { disk } = located();
        const bytes = disk.encode(next);
        const to = this.#once(openedOrThrown(target(at.root, at.rel)));
        const written = { file: to.rel, bytes: bytes.length };
        if (sameBytes(old, bytes))
            return { ...written, replaces: false, unchanged: true };
        const mode = to.entry === 'file' ? checked(() => disk.mode(to.path)) : FILE_MODE;
        this.#staged.push({ ...to, bytes, mode });
        return { ...written, replaces: true, changes: changesOf(text, next, to.rel) };
    }
    // Two writes of one file in one plan would leave it to their order which one stays.
    #once(to) {
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
    #taken(rel) {
        const takes = this.#call.replace === undefined;
        const hint = takes ? `add --replace to overwrite ${rel}` : 'pick another name';
        const issue = withHint(alreadyExists.issue(`${shown(rel)} exists and holds other bytes`), hint);
        return refusedWith([takes ? issue.command(this.#call.retry()) : issue], NOTHING_CHANGED);
    }
    // A refusal of a file the input named stands at its field. Any other error, such as a bug in
    // the function of an update, flies on as it came.
    #atField(file, work) {
        const { data, error } = trySync$(work);
        if (error === null)
            return data;
        const path = this.#fields.get(file);
        if (error instanceof Refused === false || path === undefined)
            throw error;
        const issues = error.issues.map(issue => issue.path === undefined ? atField(issue, path) : issue);
        const [first, ...rest] = issues;
        if (first === undefined)
            throw error;
        throw refusedWith([first, ...rest], NOTHING_CHANGED, error);
    }
}
/** @throws a bug refusal, DECLARATION, for a file no root of adx made */
function handleOf(file) {
    if (file instanceof Handle)
        return file;
    const issue = declaration.issue('a write names a file that no root of adx made');
    throw refusedWith([issue], NOTHING_CHANGED);
}
// Each handle the input holds, at any depth, with its place: the field first.
function* handlesIn(value, path) {
    const [field, ...below] = path;
    if ((value instanceof Handle || value instanceof Tree) && typeof field === 'string') {
        yield [value, [field, ...below]];
        return;
    }
    if (Array.isArray(value)) {
        for (const [index, item] of value.entries())
            yield* handlesIn(item, [...path, index]);
        return;
    }
    if (typeof value !== 'object' || value === null)
        return;
    for (const [key, item] of Object.entries(value))
        yield* handlesIn(item, [...path, key]);
}
// The sizes first, so a large file of another size is never read.
function sameAsFile(path, bytes) {
    const { disk } = located();
    if (disk.size(path) !== bytes.length)
        return false;
    const old = disk.read(path, bytes.length);
    return old !== undefined && sameBytes(old, bytes);
}
// The text a replace compares with: none for a file past CHANGES_BYTES or of bytes no UTF-8.
function changedText(path) {
    const { disk } = located();
    const old = disk.read(path, CHANGES_BYTES);
    return old === undefined ? undefined : disk.decode(old);
}
const sameBytes = (a, b) => a.length === b.length && a.every((byte, i) => byte === b[i]);
// Each temporary file removed; those that could not be removed are answered. A failed stage has
// no name: it removed its own.
function removed(temps) {
    const { disk } = located();
    return temps.filter(temp => temp !== '' && trySync$(() => disk.remove(temp)).error !== null);
}
// The folders the commit made, the deepest first, so "Nothing was changed" holds.
function unmade(folders) {
    const { disk } = located();
    return [...folders]
        .reverse()
        .filter(folder => trySync$(() => disk.removeFolder(folder)).error !== null);
}
function leftText(left, tried) {
    if (left.length > 0)
        return `Left behind: ${left.map(shown).join(', ')}.`;
    if (tried === 0)
        return 'No temporary file is left.';
    return tried === 1 ? 'The temporary file was removed.' : 'The temporary files were removed.';
}
function movedText(staged, failed) {
    if (failed === 0)
        return NOTHING_CHANGED;
    const names = (list) => list.map(({ rel }) => shown(rel)).join(', ');
    return `Moved in: ${names(staged.slice(0, failed))}. Not moved: ${names(staged.slice(failed))}.`;
}
