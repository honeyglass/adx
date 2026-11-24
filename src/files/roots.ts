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
import type { File, Root, RootSource } from '../core/index.ts';
import { handle, listed } from './handle.ts';

/** `location` is the folder as the author writes it, absolute or with `~`. */
export type Place =
  | { kind: 'env'; variable: string; location: string | undefined }
  | { kind: 'marker'; file: string }
  | { kind: 'cwd' };

const places = new WeakMap<object, Place>();

/**
 * A folder the person can move with a variable. Without a location, the folder is `~/.<tool name>`,
 * such as `~/.hello`; a second argument sets a location of its own.
 */
export function envDir(variable: string, location?: string): RootSource {
  return made({ kind: 'env', variable, location });
}

export function marker(file: string): RootSource {
  return made({ kind: 'marker', file });
}

export const cwd: RootSource = made({ kind: 'cwd' });

function made(place: Place): RootSource {
  const source = {};
  places.set(source, place);
  return source;
}

const roots = new WeakMap<object, Place>();

/**
 * A root from `envDir` also takes an option named after the root, such as `--home`, which wins
 * over the variable. The option cannot be switched off.
 */
export function root(name: string, from: RootSource): Root {
  const made = new Folder(name);
  // A source no function of adx made has no place; the call refuses it when the root is used.
  const place = places.get(from);
  if (place !== undefined) roots.set(made, place);
  return made;
}

/**
 * A root from envDir takes an option of its name, which wins over its variable.
 *
 * @param roots - the roots of a tool
 * @returns each root by its name, with its variable when it is a root from envDir
 */
export const rootOptions = (roots: readonly Root[]) =>
  roots.map(root => {
    const place = placeOf(root);
    return place?.kind === 'env'
      ? { name: root.name, variable: place.variable }
      : { name: root.name };
  });

/** @returns where the root lies, or undefined for a value adx did not make */
export const placeOf = (value: object) => roots.get(value);

class Folder implements Root {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  file(rel: string): File {
    return handle(this, rel, 'plain');
  }

  async list(folder: string, suffix: string) {
    return listed(this, folder, suffix);
  }
}
