/**
 * The forms of the names a tool gives, which adx writes into paths, command lines and answers.
 *
 * nameIssue: a DECLARATION issue for a name without the form of its kind.
 *
 * Each form is an allow-list (decision 90), so a sign it does not name, such as `/`, `.`, `;`
 * or a space, never reaches a path or a command line, whatever the author wrote; only the person
 * widens one. A tool name has the form of a skill name (82), a root and a stored kind the form of
 * a key (63), and a variable the form a shell gives one.
 *
 * @example const issue = nameIssue('root', root.name);
 */
import { declaration } from './codes.ts';

/** Each form, what its name is called, and the words that say the form. */
const FORMS = {
  tool: {
    form: /^[a-z0-9][a-z0-9-]{0,63}$/,
    called: 'the tool name',
    says: 'lowercase letters, digits and -, of at most 64 characters',
  },
  root: {
    form: /^[A-Za-z0-9][A-Za-z0-9-]*$/,
    called: 'the root',
    says: 'letters, digits and -, not first',
  },
  kind: {
    form: /^[A-Za-z0-9][A-Za-z0-9-]*$/,
    called: 'the stored kind',
    says: 'letters, digits and -, not first',
  },
  code: {
    form: /^[A-Z][A-Z0-9_]*$/,
    called: 'the code',
    says: 'capital letters, digits and _, from a letter on',
  },
  variable: {
    form: /^[A-Za-z_][A-Za-z0-9_]*$/,
    called: 'the variable',
    says: 'letters, digits and _, not a digit first',
  },
} as const;

/** @returns a DECLARATION issue for a name without the form of its kind, else undefined */
export function nameIssue(kind: keyof typeof FORMS, name: string) {
  const { form, called, says } = FORMS[kind];
  if (form.test(name)) return undefined;
  return declaration.issue(`${called} ${JSON.stringify(name)} is no name of ${says}`);
}
