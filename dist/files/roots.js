import { handle, listed } from "./handle.js";
const places = new WeakMap();
/**
 * A folder the person can move with a variable. Without a location, the folder is `~/.<tool name>`,
 * such as `~/.hello`; a second argument sets a location of its own.
 */
export function envDir(variable, location) {
    return made({ kind: 'env', variable, location });
}
export function marker(file) {
    return made({ kind: 'marker', file });
}
export const cwd = made({ kind: 'cwd' });
function made(place) {
    const source = {};
    places.set(source, place);
    return source;
}
const roots = new WeakMap();
/**
 * A root from `envDir` also takes an option named after the root, such as `--home`, which wins
 * over the variable. The option cannot be switched off.
 */
export function root(name, from) {
    const made = new Folder(name);
    // A source no function of adx made has no place; the call refuses it when the root is used.
    const place = places.get(from);
    if (place !== undefined)
        roots.set(made, place);
    return made;
}
/**
 * A root from envDir takes an option of its name, which wins over its variable.
 *
 * @param roots - the roots of a tool
 * @returns each root by its name, with its variable when it is a root from envDir
 */
export const rootOptions = (roots) => roots.map(root => {
    const place = placeOf(root);
    return place?.kind === 'env'
        ? { name: root.name, variable: place.variable }
        : { name: root.name };
});
/** @returns where the root lies, or undefined for a value adx did not make */
export const placeOf = (value) => roots.get(value);
class Folder {
    name;
    constructor(name) {
        this.name = name;
    }
    file(rel) {
        return handle(this, rel, 'plain');
    }
    async list(folder, suffix) {
        return listed(this, folder, suffix);
    }
}
