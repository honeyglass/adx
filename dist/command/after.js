const followed = new WeakMap();
/** @returns the commands and the function of an after, or undefined for any other value */
export const followsOf = (value) => followed.get(value);
export function after(commands, next) {
    const made = new Following();
    followed.set(made, { commands: Array.isArray(commands) ? commands : [commands], next });
    return made;
}
class Following {
}
