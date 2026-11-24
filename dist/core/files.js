const paths = new WeakMap();
/** Marks a file or folder adx made, so a step writes its path cleaned, relative to its root. */
export const shownAs = (handle) => void paths.set(handle, handle.rel);
/** @returns the path of a file or folder adx made, or undefined for any other value */
export const pathOf = (value) => typeof value === 'object' && value !== null ? paths.get(value) : undefined;
