/**
 * A step to adx's own command `schema`, which no tool has a value for.
 *
 * schema: the value adx exports, whose step(name) is the step to `schema <name>`.
 * everySchema: the step to `schema` alone, the first step of a tool without `start`.
 * schemaNameOf: the name such a step shows, '' for every command, undefined for any other step.
 *
 * The tool's name is known only when a call answers the step, so the step keeps the name in a
 * table beside it, as a step to a command keeps its parts. Nothing is checked when the step is
 * made, since a tool makes steps when its files load.
 *
 * @example next: (_, { name, kind }) => [schema.step(kind), describe.step({ name })],
 */
import type { Step } from '../core/index.ts';

const names = new WeakMap<Step, string>();

function schemaStep(does: string, name: string): Step {
  const step = { does };
  names.set(step, name);
  return step;
}

export const schema = {
  /** @param name - a shape of the tool's `shapes`, or a command by its words, such as `profile set` */
  step: (name: string): Step => schemaStep(`shows the schema of ${name}`, name),
};

export const everySchema = schemaStep('shows every command and its input', '');

export const schemaNameOf = (step: Step) => names.get(step);
