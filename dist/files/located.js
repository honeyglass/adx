/**
 * The folders of one call: where each root of its tool lies, and the call a handler reads in.
 *
 * Located, Moved: the roots of one call, and a root the call moved, by its option.
 * within, located: runs the work of a call, and the call whose files a handler reads now.
 * seedFolders: the folder of each envDir root nobody moved, where the test kit copies a seed.
 *
 * A handler reads a file through its root alone, such as home.file(...).text(limit), with no call
 * at hand, so each call keeps its roots among the values of the call that runs.
 *
 * @example const issues = new Located(spec, surroundings, { home: '/tmp/h' }).issues();
 */
import { shown } from '@honeyglass/utils/ts';
import { declaration, entered, NOTHING_CHANGED, refusedWith, rootNotFound, UNKNOWN_STATE, valueOf, } from "../core/index.js";
import { placeOf } from "./roots.js";
/**
 * @param call - the roots of the call
 * @param work - the call, which reads and writes files through its roots
 * @returns what the work answers; its error is thrown as it came
 */
export function within(call, work) {
    return entered(call.scope, Located, call, work);
}
/** @throws a bug refusal, DECLARATION, for a file used while no call of its tool runs */
export function located() {
    const call = valueOf(Located);
    if (call instanceof Located)
        return call;
    const issue = declaration.issue('a file of a root was used while no call of its tool ran');
    throw refusedWith([issue], UNKNOWN_STATE);
}
export class Located {
    disk;
    scope;
    #tool;
    #around;
    /** The value of each root option the call gave, by the name of the root. */
    #given;
    constructor(tool, around, given) {
        this.disk = around.disk;
        this.scope = around.scope;
        this.#tool = tool;
        this.#around = around;
        this.#given = given;
    }
    /**
     * @param root - a root of the tool
     * @returns its folder, which a default envDir folder need not have yet
     * @throws a refusal ROOT_NOT_FOUND for a folder that is not there, DECLARATION for a root the
     * tool does not list
     */
    folderOf(root) {
        const where = this.#whereOf(root);
        if ('folder' in where)
            return where;
        // A root is found before any file is written, so nothing was changed yet.
        throw refusedWith([where], NOTHING_CHANGED);
    }
    /**
     * A moved folder is checked before the call runs, so a wrong one never stands in a step; a
     * marker is looked for only when its root is used, since a command may not need it.
     *
     * @returns one ROOT_NOT_FOUND issue per root the call moved to a folder that is not there
     */
    issues() {
        return this.#tool.roots.flatMap(root => {
            const place = placeOf(root);
            if (place?.kind !== 'env' || this.#named(root, place) === undefined)
                return [];
            const where = this.#whereOf(root);
            return 'folder' in where ? [] : [where];
        });
    }
    /** @returns each root the call moved, with its folder, for the commands adx names */
    moved() {
        return this.#tool.roots.flatMap(root => {
            const where = this.#whereOf(root);
            return 'folder' in where && where.moved ? [{ option: root.name, folder: where.folder }] : [];
        });
    }
    // A root the tool does not list has no option, so the call could not have moved it.
    #whereOf(root) {
        const place = placeOf(root);
        if (this.#tool.roots.includes(root) === false || place === undefined) {
            const message = `the root ${root.name} is not in the roots of ${this.#tool.name}`;
            return declaration.issue(message);
        }
        if (place.kind === 'cwd')
            return { folder: this.#around.cwd, moved: false };
        if (place.kind === 'marker')
            return this.#marked(root, place.file);
        return this.#envFolder(root, place);
    }
    // An empty, relative or missing folder is refused, never replaced by the default (decision 13).
    #envFolder(root, place) {
        const named = this.#named(root, place);
        if (named === undefined)
            return this.#defaultOf(root, place);
        const folder = absoluteOf(named.folder, this.#around);
        if (folder === undefined) {
            return rootNotFound.issue(`${named.by} names ${shown(named.folder)}, no absolute path`);
        }
        const real = this.disk.real(folder);
        if (real === undefined || this.disk.entry(real) !== 'folder') {
            return rootNotFound.issue(`${named.by} names ${shown(named.folder)}, and no folder is there`);
        }
        return { folder, moved: true };
    }
    // The option wins over the variable; an empty variable names a folder too, and is refused.
    #named(root, place) {
        const option = Object.hasOwn(this.#given, root.name) ? this.#given[root.name] : undefined;
        if (option !== undefined)
            return { folder: option, by: `--${root.name}` };
        const variable = this.#around.env[place.variable];
        return variable === undefined ? undefined : { folder: variable, by: place.variable };
    }
    // A test keeps a root at an absolute place of its own inside its scratch folder.
    #defaultOf(root, place) {
        const location = place.location ?? `~/.${this.#tool.name}`;
        const folder = absoluteOf(location, this.#around);
        if (folder === undefined) {
            const message = `the root ${root.name} lies at ${shown(location)}, no absolute path`;
            return declaration.issue(message);
        }
        const { confined } = this.#around;
        if (confined === undefined || location.startsWith('~'))
            return { folder, moved: false };
        return { folder: this.disk.join(confined, `roots/${root.name}`), moved: false };
    }
    #marked(root, file) {
        let folder = this.#around.cwd;
        while (this.disk.entry(this.disk.join(folder, file)) === undefined) {
            const parent = this.disk.parent(folder);
            if (parent === folder || folder === this.#around.confined) {
                const message = `no folder from ${shown(this.#around.cwd)} up holds ${shown(file)}`;
                return rootNotFound.issue(message);
            }
            folder = parent;
        }
        return { folder, moved: false };
    }
}
/**
 * @param tool - the name of the tool and its roots
 * @param around - the home folder of the call
 * @returns the folder of each envDir root that nobody moved
 */
export function seedFolders(tool, around) {
    const call = new Located(tool, { ...around, env: {} }, {});
    return tool.roots
        .filter(root => placeOf(root)?.kind === 'env')
        .map(root => call.folderOf(root).folder);
}
// `~` is the home folder of the call; a path neither absolute nor from `~` has no place.
function absoluteOf(path, around) {
    if (path === '~')
        return around.home;
    if (path.startsWith('~/'))
        return around.disk.join(around.home, path.slice(2));
    return around.disk.isAbsolute(path) ? path : undefined;
}
