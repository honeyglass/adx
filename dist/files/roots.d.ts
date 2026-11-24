/**
 * Roots: the folders a tool may use, and where each one lies.
 *
 * envDir, marker, cwd: a folder the person can move, the nearest folder up that holds a file, and
 * the working directory.
 * Place, placeOf: where a root lies, as the call reads it.
 * root: a root under its name.
 * rootOptions: each root of a tool by its name, with the variable that moves it, if any.
 *
 * Nothing is checked when a root is made: a tool makes its roots when its files load, and the
 * call finds each folder. A root answers files at once and reads them only when they are used.
 *
 * @example const home = root('home', envDir('HELLO_HOME'));
 */
import type { Root, RootSource } from '../core/index.ts';
/** `location` is the folder as the author writes it, absolute or with `~`. */
export type Place = {
    kind: 'env';
    variable: string;
    location: string | undefined;
} | {
    kind: 'marker';
    file: string;
} | {
    kind: 'cwd';
};
/**
 * A folder the person can move with a variable. Without a location, the folder is `~/.<tool name>`,
 * such as `~/.hello`; a second argument sets a location of its own.
 */
export declare function envDir(variable: string, location?: string): RootSource;
export declare function marker(file: string): RootSource;
export declare const cwd: RootSource;
/**
 * A root from `envDir` also takes an option named after the root, such as `--home`, which wins
 * over the variable. The option cannot be switched off.
 */
export declare function root(name: string, from: RootSource): Root;
/**
 * A root from envDir takes an option of its name, which wins over its variable.
 *
 * @param roots - the roots of a tool
 * @returns each root by its name, with its variable when it is a root from envDir
 */
export declare const rootOptions: (roots: readonly Root[]) => ({
    name: string;
    variable: string;
} | {
    name: string;
    variable?: undefined;
})[];
/** @returns where the root lies, or undefined for a value adx did not make */
export declare const placeOf: (value: object) => Place | undefined;
