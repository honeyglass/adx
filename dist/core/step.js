const partsByStep = new WeakMap();
/** Each method answers a new step, so a step a tool keeps, such as in a hint, never changes. */
class Planned {
    does;
    #parts;
    constructor(parts) {
        this.does = parts.target.does;
        this.#parts = parts;
        partsByStep.set(this, parts);
    }
    needs(...fields) {
        return new Planned({ ...this.#parts, needed: [...this.#parts.needed, ...fields] });
    }
    carry(...fields) {
        return new Planned({ ...this.#parts, carried: [...this.#parts.carried, ...fields] });
    }
    lists(field) {
        return new Planned({ ...this.#parts, listed: field });
    }
}
/**
 * @param target - the command the step names
 * @param given - the fields the step gives, as a caller writes them
 * @returns the step, which needs, carries and lists nothing yet
 */
export function commandStep(target, given) {
    return new Planned({ target, given, needed: [], carried: [], listed: undefined });
}
/** @returns the parts of a step to a command, or undefined for any other step */
export const partsOfStep = (step) => partsByStep.get(step);
