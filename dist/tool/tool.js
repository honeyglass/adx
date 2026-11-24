/**
 * The tool: its commands put together, and main(), which runs one call.
 *
 * Tool, ToolSpec, Commands, tool: the tool, what tool() takes, and tool() itself.
 * specOf: the spec of a tool that tool() made, for the test kit, which gets only the tool.
 *
 * Nothing is checked when tool() is called: a tool is built when its file loads, and a check
 * belongs in main() or the call.
 *
 * @example export const hello = tool({ name: 'hello', version: '0.1.0', does: 'greets', commands: { greet } });
 */
import { main } from "./main.js";
/** A tool knows its spec; the table lets run() of the test kit find it from the tool alone. */
const specs = new WeakMap();
export function tool(spec) {
    const made = { main: () => main(spec) };
    specs.set(made, spec);
    return made;
}
export const specOf = (made) => specs.get(made);
