/**
 * The file of a skill the tool names, found by its name (decision 82).
 *
 * skillFile: the path of the skill's SKILL.md, or undefined while it is not known.
 *
 * Not decided yet: where the kit looks in a test, at the real home's
 * `~/.claude/skills/<name>/SKILL.md`, in the scratch home, or at a path the test gives. The check
 * of the agent skill asks this one function, so the decision changes this function only. Until
 * then it answers undefined, and the check is not probed.
 *
 * @example const file = skillFile('hello');
 */
/** @returns undefined: where the kit finds a skill by its name is open (decision 82) */
export const skillFile = (_name) => undefined;
