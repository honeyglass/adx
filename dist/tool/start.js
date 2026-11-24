/**
 * The start answer: the tool called alone names itself, its commands and the first steps.
 *
 * started: the answer, and its text for a person at a terminal.
 *
 * The answer holds the name, the version, what the tool does, the name of the skill or null, the
 * commands and the first steps, and no data of the tool (decision 72): data comes from a command.
 * Without `start`, the first step is `schema`.
 *
 * @example if (routed.words.length === 0) return started(shell);
 */
import { commandsIn } from "../command/index.js";
import { everySchema, stepAnswer } from "../steps/index.js";
import { knows } from "./schema.js";
import { columns } from "./text.js";
/**
 * @param shell - what the call reads of the tool
 * @param folders - each root the call moved, which the steps carry
 */
export async function started(shell, folders) {
    const commands = commandsIn(shell.commands, []);
    const steps = (await shell.start?.()) ?? [everySchema];
    const next = await Promise.all(steps.map(step => stepAnswer(step, { tool: shell.name, input: {}, folders, knowsSchema: knows(shell) })));
    const result = {
        name: shell.name,
        version: shell.version,
        does: shell.does,
        skill: shell.skill ?? null,
        commands: commands.map(({ command, does }) => ({ command: `${shell.name} ${command}`, does })),
    };
    const rows = commands.map(({ command, does }) => [command, does]);
    const text = () => `${shell.name} ${shell.version}: ${shell.does}\n\nCommands:\n${columns(rows)}`;
    return { answer: { ok: true, result, ...(next.length > 0 ? { next } : {}) }, text };
}
