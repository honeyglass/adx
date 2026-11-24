/**
 * The tool: its commands put together, and main(), which runs one call.
 *
 * Tool, ToolSpec, Shell, tool: the tool, what tool() takes, what a call reads of it, and tool().
 * specOf: the spec of a tool that tool() made, for the test kit, which gets only the tool.
 *
 * Nothing is checked when tool() is called: a tool is built when its file loads, and a check
 * belongs in main() or the call. tool() only gives each command the words that call it, the
 * way the tool answers a call of it, so invoke answers as the tool prints, the sources of its
 * fields, the roots of the tool, whose options every command takes, and the send of `apply`. A shape is kept as
 * given: `schema` reads it, and a SCHEMA issue finds it by its value.
 *
 * @example export const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets', commands: { greet } });
 */
import { placeAll } from "../command/index.js";
import { rootOptions } from "../files/index.js";
import { act } from "../remote/index.js";
import { sources } from "../values/index.js";
import { main } from "./main.js";
import { invoked } from "./through.js";
/** A tool knows its spec; the table lets run() of the test kit find it from the tool alone. */
const specs = new WeakMap();
export function tool(spec) {
    const shell = {
        name: spec.name,
        version: spec.version,
        does: spec.does,
        commands: spec.commands,
        roots: spec.roots ?? [],
        remotes: spec.remotes ?? [],
        shapes: spec.shapes ?? {},
        next: spec.next ?? [],
        hints: spec.hints ?? [],
        start: spec.start,
    };
    const roots = rootOptions(shell.roots);
    placeAll(shell.commands, {
        name: shell.name,
        through: call => invoked(shell, call),
        sources,
        roots,
        act,
    });
    const made = { main: () => main(shell) };
    specs.set(made, shell);
    return made;
}
export const specOf = (made) => specs.get(made);
