/**
 * What the source of a field answers for the input of a call.
 *
 * Asked, asked: the answer, by its kind, and the one place where adx runs a source.
 *
 * A source runs when a call lists a field and when its values are checked, and also while a
 * refusal is answered: for a value a step carries, and for a field a list needs first. The block
 * of every remote while a refusal is answered (decision 79) belongs around this call.
 *
 * An answer that is neither a list of choices nor needs(), and a needs() of a field the source
 * got, are bugs of the tool: adx refuses them as DECLARATION, never lets the call through.
 *
 * @example const answer = await asked('lang', command.sourceOf('lang'), known.checked);
 */
import { declaration, refusedWith, UNKNOWN_STATE } from '../core/index.ts';
import type { AnyList, Choice, Declared } from '../core/index.ts';
import { takerOf } from './fresh.ts';
import { neededOf } from './needs.ts';
import { refOf } from './ref.ts';

export type Asked =
  | { kind: 'choices'; choices: readonly Choice[] }
  | { kind: 'needs'; fields: readonly string[] }
  | { kind: 'taken'; names: readonly string[] }
  | { kind: 'list'; list: AnyList }
  | { kind: 'none' };

/**
 * @param field - the field whose source it is, for the message of a bug
 * @param source - the source of the field, if it has one
 * @param input - the input of the call as far as it passed the schema and its lists
 * @returns the choices, the fields it needs first, the names taken, or the list of its keys
 * @throws a bug refusal, DECLARATION, for an answer of no kind, or a needs() of a field it got
 */
export async function asked(
  field: string,
  source: Declared | undefined,
  input: Readonly<Record<string, unknown>>,
): Promise<Asked> {
  if (source === undefined) return { kind: 'none' };
  const ref = refOf(source);
  if (ref !== undefined) return { kind: 'list', list: ref.list };
  const taker = takerOf(source);
  if (taker !== undefined) return { kind: 'taken', names: await taker.taken(input) };
  if (typeof source !== 'function') return { kind: 'none' };
  const answer: unknown = await source(input);
  if (Array.isArray(answer) && answer.every(isChoice)) return { kind: 'choices', choices: answer };
  const fields = typeof answer === 'object' && answer !== null ? neededOf(answer) : undefined;
  if (fields === undefined)
    throw broken(`the source of ${field} answered no choices and no needs()`);
  const got = fields.filter(name => Object.hasOwn(input, name) && input[name] !== undefined);
  if (got.length > 0) throw broken(`the source of ${field} needs ${got.join(', ')}, which it got`);
  return { kind: 'needs', fields };
}

const isChoice = (value: unknown): value is Choice =>
  typeof value === 'object' &&
  value !== null &&
  'value' in value &&
  typeof value.value === 'string';

// A source may run while a refusal after a send is answered, so what the call left is unknown.
const broken = (message: string) => refusedWith([declaration.issue(message)], UNKNOWN_STATE);
