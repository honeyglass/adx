/**
 * The shape a SCHEMA issue lies in, so its command shows that shape (decisions 72 and 78).
 *
 * shapeNameAt: the name of the innermost shape the tool registers along the place of an issue.
 *
 * adx knows a shape by its value: the same value stands in `shapes` and in the schema, or in the
 * call of check(); a copy, such as one `.describe()` makes, is another value. Of two shapes on the
 * path, the inner one counts.
 *
 * @example const name = shapeNameAt(shell.shapes, place);
 */
import { schemasAlong } from "../core/index.js";
/**
 * @param shapes - the shapes of the tool
 * @param place - where the issue stands in the schema that failed
 * @returns the name of the innermost registered shape, or undefined when it lies in none
 */
export function shapeNameAt(shapes, place) {
    const named = place.named === undefined ? [] : [place.named];
    const along = [...named, ...schemasAlong(place.root, place.value, place.below)];
    return along
        .toReversed()
        .map(schema => Object.keys(shapes).find(name => shapes[name] === schema))
        .find(name => name !== undefined);
}
