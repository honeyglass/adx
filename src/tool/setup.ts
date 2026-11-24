/**
 * The setup of a tool that the compiler cannot see, checked at the start of every call.
 *
 * setupIssues: one DECLARATION issue per mistake: in the command table, per command an `after`
 * names that the tool does not list, per code that has a second hint, per hint whose step names
 * a command the tool does not list or a name `schema` does not know, per shape that is no word
 * or has the word of a command, per list whose pages or one-item command do not fit, per effect
 * with `apply` and no `look`, per id() field without a source, per remote whose own address or
 * token cannot work, per stored kind whose format numbers do not run from the newest down or
 * whose format has a field `version`, and for a skill whose name has not the form of one.
 *
 * The function of a hint gets nothing, so its step is checked here, before any call (decision
 * 73). Every other step is made in a function that a call runs, such as `next`, so the answer
 * checks it when it writes the step out.
 *
 * A remote the tool does not list shows only at its first request: a remote is a value of the
 * author's files, and nothing tells which of them a command reads before it runs.
 *
 * @example const [wrong, ...more] = setupIssues(shell, around.network);
 */
import { declarationIssues, followsOf, isWord, runnerOf, runnersIn } from '../command/index.ts';
import { declaration, isId, partsOfStep } from '../core/index.ts';
import type { Issue, Network } from '../core/index.ts';
import { setupIssuesOf } from '../remote/index.ts';
import { codeOf, schemaNameOf, stepOfHint } from '../steps/index.ts';
import type { Hint } from '../steps/index.ts';
import { kindIssues } from '../stored/index.ts';
import { detailsOf } from './detail.ts';
import { SKILL_NAME } from './limits.ts';
import { knows } from './schema.ts';
import type { Shell } from './tool.ts';

/**
 * @param shell - what the call reads of the tool
 * @param network - the parser of the call, which reads each address as its requests would
 */
export function setupIssues(shell: Shell, network: Network): Issue[] {
  return [
    ...declarationIssues(shell.commands),
    ...afterIssues(shell),
    ...hintIssues(shell),
    ...shell.hints.flatMap(made => hintStepIssues(shell, made)),
    ...shapeIssues(shell),
    ...listIssues(shell),
    ...lookIssues(shell),
    ...idIssues(shell),
    ...shell.remotes.flatMap(remote => setupIssuesOf(remote, network)),
    ...shell.stored.flatMap(kindIssues),
    ...skillIssues(shell),
  ];
}

// The test kit finds the skill by its name under ~/.claude/skills/, so the name is part of a path.
function skillIssues({ skill }: Shell) {
  if (skill === undefined || SKILL_NAME.test(skill)) return [];
  const message = `the skill ${JSON.stringify(skill)} is no name of lowercase letters, digits and -, of at most 64 characters`;
  return [declaration.issue(message)];
}

// An id names something that exists, so its option lists the values it takes (rule 13).
function idIssues(shell: Shell) {
  return [...runnersIn(shell.commands)].flatMap(runner =>
    runner
      .fields()
      .filter(
        ({ field }) => isId(runner.input.shape[field]) && runner.sourceOf(field) === undefined,
      )
      .map(({ field }) =>
        declaration.issue(
          `${shell.name} ${runner.name} has the id field ${field}, and no source in values lists its values`,
        ),
      ),
  );
}

// A step from tell, or of any other value, names no command, and the issues of the code need one.
function hintStepIssues(shell: Shell, made: Hint) {
  const step = stepOfHint(made);
  if (step === undefined) return [];
  const about = `the hint for ${codeOf(made)}`;
  const target = partsOfStep(step)?.target;
  const name = schemaNameOf(step);
  if (target !== undefined) {
    const listed = [...runnersIn(shell.commands)].some(runner => runner === target);
    if (listed) return [];
    const message = `${about} names the command that ${target.does}, and ${shell.name} does not list it`;
    return [declaration.issue(message)];
  }
  if (name === undefined) return [declaration.issue(`${about} names no command`)];
  if (name === '' || knows(shell)(name)) return [];
  return [
    declaration.issue(`${about} names ${shell.name} schema ${name}, and schema knows no ${name}`),
  ];
}

// After a failed send only the look can show what the call left.
function lookIssues(shell: Shell) {
  return [...runnersIn(shell.commands)]
    .filter(runner => runner.spec.apply !== undefined && runner.spec.look === undefined)
    .map(runner =>
      declaration.issue(
        `${shell.name} ${runner.name} has apply and no look, the call that shows what it left`,
      ),
    );
}

// A page of no whole number of items never ends. An outline that hides a field needs the one
// command that shows an item in full, and two such commands leave the step after a page to the
// order of the table.
function listIssues(shell: Shell) {
  const lists = [...runnersIn(shell.commands)].filter(runner => runner.kind === 'list');
  return lists.flatMap(list => {
    const name = `${shell.name} ${list.name}`;
    const size = list.pageSize();
    const sized = Number.isSafeInteger(size) && size > 0;
    const details = detailsOf(shell, list).map(({ target }) => `${shell.name} ${target.name}`);
    const hidden = list.hidden().join(', ');
    return [
      ...(sized ? [] : [`${name} has the page size ${size}, and a page holds 1 item or more`]),
      ...(details.length > 1 ? [`${details.join(' and ')} each show one item of ${name}`] : []),
      ...(details.length === 0 && hidden !== ''
        ? [`${name} hides ${hidden} in its outline, and no detailOf of it names a command`]
        : []),
    ].map(message => declaration.issue(message));
  });
}

// `schema <word>` names a shape or a command; a group may share its word, and the shape wins.
function shapeIssues(shell: Shell) {
  return Object.keys(shell.shapes).flatMap(name => {
    if (isWord(name) === false) {
      const message = `the shape ${JSON.stringify(name)} is no word of letters, digits and -`;
      return [declaration.issue(message)];
    }
    const entry = Object.hasOwn(shell.commands, name) ? shell.commands[name] : undefined;
    if (entry === undefined || runnerOf(entry) === undefined) return [];
    return [
      declaration.issue(`the shape ${name} has the word of the command ${shell.name} ${name}`),
    ];
  });
}

// Two hints for one code would leave the command of its issues to their order.
function hintIssues(shell: Shell) {
  const codes = shell.hints.map(codeOf);
  return codes
    .filter((code, i) => codes.indexOf(code) < i)
    .map(code => declaration.issue(`${shell.name} has a second hint for the code ${code}`));
}

// A command no tool lists has no words yet, so the issue names what it does.
function afterIssues(shell: Shell) {
  const listed = runnersIn(shell.commands);
  return shell.next
    .flatMap(after => followsOf(after)?.commands ?? [])
    .map(command => runnerOf(command))
    .filter(runner => runner === undefined || listed.has(runner) === false)
    .map(runner => {
      const does = runner === undefined ? 'is no command' : runner.does;
      const message = `an after names a command that ${does}, and ${shell.name} does not list it`;
      return declaration.issue(message);
    });
}
