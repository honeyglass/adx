/**
 * A next move: a step for the person, or a step to a command that the answer writes out later.
 *
 * Step: what every step has, what it does and, for a command, the command.
 * CommandStep, commandStep: a step to a command, with the fields it gives, needs, carries and lists.
 * Target, TargetField: what a step reads of the command it names.
 * StepParts, partsOfStep: what a step to a command holds beside what it does.
 *
 * A step is made before its command line can be known: the tool that lists the command, the
 * global fields of the call and the fields a refusal carries come from the call that answers it.
 * So a step keeps its parts in a table beside it, and the answer writes the line. The step then
 * has the members proto/adx/index.d.ts declares and no other, as an Issue has.
 *
 * @example const step = commandStep(runner, { lang: 'de' }).needs('style');
 */
export interface Step {
  readonly does: string;
  readonly command?: string;
}

/**
 * `L` names the fields the step can list: those with a source in the `values` of the command.
 * `N` names the fields `needs` takes. A field is listed or needed, never both.
 */
export interface CommandStep<
  I,
  L extends string = never,
  N extends string = keyof I & string,
> extends Step {
  needs<K extends N = never>(...fields: K[]): CommandStep<I, Exclude<L, K>, N>;
  carry(...fields: (keyof I & string)[]): CommandStep<I, L, N>;
  lists<K extends L>(field: K): CommandStep<I, L, Exclude<N, K>>;
}

/**
 * One field of the command a step names. `option` is absent for a field of --json only;
 * `global` marks a field of the tool's global input.
 */
export type TargetField = {
  field: string;
  option?: string;
  switch: boolean;
  repeats: boolean;
  required: boolean;
  global: boolean;
};

export interface Target {
  readonly does: string;
  /** The name of the tool and the words of the command, or undefined while no tool lists it. */
  readonly call: readonly string[] | undefined;
  fields(): readonly TargetField[];
  /** Whether a real call of the command would take this value of the field. */
  accepts(field: string, value: unknown): Promise<boolean>;
}

export type StepParts = {
  target: Target;
  given: Readonly<Record<string, unknown>>;
  needed: readonly string[];
  carried: readonly string[];
  listed: string | undefined;
};

const partsByStep = new WeakMap<Step, StepParts>();

/** Each method answers a new step, so a step a tool keeps, such as in a hint, never changes. */
class Planned<I, L extends string, N extends string> implements CommandStep<I, L, N> {
  readonly does: string;
  readonly #parts: StepParts;

  constructor(parts: StepParts) {
    this.does = parts.target.does;
    this.#parts = parts;
    partsByStep.set(this, parts);
  }

  needs<K extends N = never>(...fields: K[]): CommandStep<I, Exclude<L, K>, N> {
    return new Planned({ ...this.#parts, needed: [...this.#parts.needed, ...fields] });
  }

  carry(...fields: (keyof I & string)[]): CommandStep<I, L, N> {
    return new Planned({ ...this.#parts, carried: [...this.#parts.carried, ...fields] });
  }

  lists<K extends L>(field: K): CommandStep<I, L, Exclude<N, K>> {
    return new Planned({ ...this.#parts, listed: field });
  }
}

/**
 * @param target - the command the step names
 * @param given - the fields the step gives, as a caller writes them
 * @returns the step, which needs, carries and lists nothing yet
 */
export function commandStep<I, L extends string>(
  target: Target,
  given: Readonly<Record<string, unknown>>,
): CommandStep<I, L> {
  return new Planned({ target, given, needed: [], carried: [], listed: undefined });
}

/** @returns the parts of a step to a command, or undefined for any other step */
export const partsOfStep = (step: Step) => partsByStep.get(step);
