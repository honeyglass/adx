/**
 * The command that shows one item of a list in full: one whose field takes a key of the list
 * with detailOf.
 *
 * detailsOf: every such command the tool lists, each with that field.
 *
 * The answer of a list names the one it finds, and the setup refuses a second one, so the step
 * after a page never depends on the order of the table.
 *
 * @example const [detail] = detailsOf(shell, runner);
 */
import { runnerOf, runnersIn } from "../command/index.js";
import { refOf } from "../values/index.js";
/**
 * @param shell - what the call reads of the tool
 * @param list - the list command
 * @returns each command of the tool with a field whose source is detailOf(list)
 */
export function detailsOf(shell, list) {
    return [...runnersIn(shell.commands)].flatMap(runner => runner.fields().flatMap(({ field }) => {
        const source = runner.sourceOf(field);
        const ref = source === undefined ? undefined : refOf(source);
        const shows = ref?.role === 'detail' && runnerOf(ref.list) === list;
        return shows ? [{ target: runner, field }] : [];
    }));
}
