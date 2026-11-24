/**
 * The setup of a tool that the compiler cannot see, checked at the start of every call.
 *
 * setupIssues: one DECLARATION issue per mistake: in the command table, per command an `after`
 * names that the tool does not list, and per code that has a second hint.
 *
 * @example const [wrong, ...more] = setupIssues(shell);
 */
import { declarationIssues, followsOf, runnerOf, runnersIn } from '../command/index.ts';
import { declaration } from '../core/index.ts';
import type { Issue } from '../core/index.ts';
import { codeOf } from '../steps/index.ts';
import type { Shell } from './tool.ts';

/** @param shell - what the call reads of the tool */
export function setupIssues(shell: Shell): Issue[] {
  return [...declarationIssues(shell.commands), ...afterIssues(shell), ...hintIssues(shell)];
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
