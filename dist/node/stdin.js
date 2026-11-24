/**
 * The text piped into the program, for `--json -`.
 *
 * stdinText: the text, cut one character past STDIN_LIMIT; bytes that are no UTF-8; or null when
 * stdin is a terminal.
 *
 * A terminal holds no piped text, and a read there would wait for the person, so it answers null.
 * The read stops past the limit, so a stream that never ends costs no more than the limit. The
 * bytes are decoded strictly: a byte that is no UTF-8 never turns into a replacement character.
 *
 * @example const piped = await stdinText();
 */
import { stdin } from 'node:process';
import { $try, trySync$ } from '@honeyglass/utils/ts';
import { codePointsIn, NOTHING_CHANGED, refusedWith, STDIN_LIMIT, systemRefused, } from "../core/index.js";
/**
 * @returns the text piped in, at most one character past the limit, `utf8: false` for bytes that
 * are no UTF-8, or null for a terminal
 * @throws a refusal SYSTEM_REFUSED, kind ask, when stdin cannot be read
 */
export async function stdinText() {
    if (stdin.isTTY === true)
        return null;
    const { data, error } = await $try(() => textUpTo(stdin, STDIN_LIMIT));
    if (error === null)
        return data;
    const issue = systemRefused.issue(`stdin could not be read: ${error.message}`);
    throw refusedWith([issue], NOTHING_CHANGED, error);
}
// The decoder keeps a character split between two chunks until its last byte comes, so each
// piece holds whole characters. Leaving the loop early destroys the stream: nothing more is read.
async function textUpTo(stream, limit) {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let text = '';
    let count = 0;
    for await (const chunk of stream) {
        const piece = trySync$(() => decoder.decode(chunk, { stream: true }));
        if (piece.error !== null)
            return { utf8: false };
        text += piece.data;
        count += codePointsIn(piece.data);
        if (count > limit)
            return { text };
    }
    const rest = trySync$(() => decoder.decode());
    return rest.error === null ? { text: `${text}${rest.data}` } : { utf8: false };
}
