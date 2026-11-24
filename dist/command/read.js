/**
 * The kind of command that only reads.
 *
 * read: a command from its input schema and its handler.
 *
 * Nothing is checked when read() is called: a tool builds its commands when its files load.
 *
 * @example const greet = read({ does: 'greets', input, example: { name: 'Ada' }, run: ({ name }) => ({ name }) });
 */
import { Command } from "./command.js";
export function read(spec) {
    return new Command(spec);
}
