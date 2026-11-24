/**
 * The folder of the tool's package.json, next to which the fingerprints of the stored kinds lie
 * (decisions 37 and 55).
 *
 * packageFolder: that folder, or undefined while it is not known.
 *
 * Not decided yet: how adx finds the folder at run time. The check of the stored data asks this
 * one function, so the decision changes this function only. Until then it answers undefined, and
 * the check is not probed.
 *
 * @example const folder = packageFolder();
 */
/** @returns undefined: how adx finds the folder is open (decision 37) */
export const packageFolder = () => undefined;
