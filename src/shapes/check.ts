/**
 * A part of the input checked in the handler, such as a part whose shape stored data picks.
 *
 * check: the checked value, or one SCHEMA issue per problem, each at the path plus its place.
 *
 * A key an object of the shape does not name is a problem too, as in the input of a command.
 *
 * check() refuses no value: the handler reports the issues with refuse(), beside issues of other
 * checks, so one answer names them all. A shape of a kind the check cannot look into, such as a
 * map, is a DECLARATION error it throws, since no value could pass it checked; a shape the tool
 * lists is refused at startup already. The issues are placed in the checked shape, so the tool
 * that answers them names the shape the tool registers, or the schema of the command that ran.
 * With `as`, that shape stands in for the checked one; what is checked does not change.
 *
 * @example const said = check(ABOUT[friend.kind], about, ['about']);
 */
import type { z } from 'zod';
import { brokenLinesIn, failuresOf, placed, schemaFailed, unknownKeysIn } from '../core/index.ts';
import type { Issue, Path } from '../core/index.ts';

/**
 * @param shape - the schema the part must pass
 * @param value - the part
 * @param path - where the part stands: a field of the command first, then keys and indexes
 * @param options - `as`, the shape whose schema the issues name in place of the checked one
 * @returns the checked value with `issues: null`, or `data: null` with at least one issue
 * @throws a bug refusal, DECLARATION, for a shape of a kind the check cannot look into
 */
export function check<S extends z.ZodType, const P extends string>(
  shape: S,
  value: unknown,
  path: Path<P>,
  options?: { as: z.ZodType },
): { data: z.output<S>; issues: null } | { data: null; issues: [Issue<P>, ...Issue<P>[]] } {
  const parsed = shape.safeParse(value);
  const failures = [
    ...unknownKeysIn(shape, value),
    ...brokenLinesIn(shape, value),
    ...(parsed.success ? [] : parsed.error.issues.flatMap(failuresOf)),
  ];
  const [field, ...within] = path;
  const place = { root: shape, value, named: options?.as ?? shape };
  const [first, ...rest] = failures.map(({ below, message }) =>
    placed(schemaFailed.at([field, ...within, ...below], message), { ...place, below }),
  );
  if (first !== undefined) return { data: null, issues: [first, ...rest] };
  if (parsed.success) return { data: parsed.data, issues: null };
  // Zod names at least one issue; the part itself stands in for a parse that names none.
  return { data: null, issues: [schemaFailed.at(path, parsed.error.message)] };
}
