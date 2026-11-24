/**
 * What a handler writes with console while the test kit runs one call in its process.
 *
 * captured: the result of the work, and the lines console wrote to stdout and stderr meanwhile.
 *
 * The process has one console, so two calls that run at the same time capture each other's lines.
 *
 * @example const { data, out, err } = await captured(() => call(spec, around));
 */
import { Console } from 'node:console';
import { Writable } from 'node:stream';
import { $try } from '@honeyglass/utils/ts';
/**
 * @param work - the call, which writes its answer itself and may log with console
 * @returns its result, and what console wrote to stdout and to stderr
 */
export async function captured(work) {
    const out = [];
    const err = [];
    const original = globalThis.console;
    globalThis.console = new Console({ stdout: sink(out), stderr: sink(err) });
    const { data, error } = await $try(work);
    globalThis.console = original;
    if (error !== null)
        throw error;
    return { data, out: out.join(''), err: err.join('') };
}
const sink = (chunks) => new Writable({
    decodeStrings: false,
    write(chunk, _encoding, done) {
        chunks.push(chunk);
        done();
    },
});
