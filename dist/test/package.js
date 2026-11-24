/**
 * The folder of the tool's package.json, from which the skill path counts (decision 36) and next
 * to which the fingerprints of the stored kinds lie (decisions 37 and 55).
 *
 * packageFolder: that folder, or undefined while it is not known.
 *
 * Not decided yet: how adx finds the folder at run time. Every check that needs it, the agent
 * skill and the stored data, asks this one function, so the decision changes this function only.
 * Until then it answers undefined, and those checks are not probed.
 *
 * @example const folder = packageFolder();
 */
/** @returns undefined: how adx finds the folder is open (decisions 36 and 37) */
export const packageFolder = () => undefined;
