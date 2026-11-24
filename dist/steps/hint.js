const helping = new WeakMap();
/**
 * @param code - a code the tool declared with code()
 * @param step - the step to the command that helps; a step from tell has no command
 * @returns the hint, which the tool takes in `hints`
 */
export function hint(code, step) {
    const made = new Helped();
    // An issue of the code carries its name, the one every issue of a refusal names.
    helping.set(made, { code: code.issue().code, step });
    return made;
}
class Helped {
}
/** @returns the name of the code the hint stands for, or undefined for any other value */
export const codeOf = (made) => helping.get(made)?.code;
/** @returns the step the hint names, or undefined for any other value */
export const stepOfHint = (made) => helping.get(made)?.step();
/**
 * @param hints - the hints of the tool, at most one per code, as the start checks
 * @param code - the code of an issue
 * @returns the step of the hint for the code, or undefined when none stands for it
 */
export function hintFor(hints, code) {
    const found = hints.map(made => helping.get(made)).find(helped => helped?.code === code);
    return found?.step();
}
