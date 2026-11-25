import { brokenLinesIn, failuresOf, placed, schemaFailed, unknownKeysIn } from "../core/index.js";
/**
 * @param shape - the schema the part must pass
 * @param value - the part
 * @param path - where the part stands: a field of the command first, then keys and indexes
 * @param options - `as`, the shape whose schema the issues name in place of the checked one
 * @returns the checked value with `issues: null`, or `data: null` with at least one issue
 * @throws a bug refusal, DECLARATION, for a shape of a kind the check cannot look into
 */
export function check(shape, value, path, options) {
    const parsed = shape.safeParse(value);
    const failures = [
        ...unknownKeysIn(shape, value),
        ...brokenLinesIn(shape, value),
        ...(parsed.success ? [] : parsed.error.issues.flatMap(failuresOf)),
    ];
    const [field, ...within] = path;
    const place = { root: shape, value, named: options?.as ?? shape };
    const [first, ...rest] = failures.map(({ below, message }) => placed(schemaFailed.at([field, ...within, ...below], message), { ...place, below }));
    if (first !== undefined)
        return { data: null, issues: [first, ...rest] };
    if (parsed.success)
        return { data: parsed.data, issues: null };
    // Zod names at least one issue; the part itself stands in for a parse that names none.
    return { data: null, issues: [schemaFailed.at(path, parsed.error.message)] };
}
