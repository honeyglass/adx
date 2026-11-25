/**
 * What one program leaves: its answer on stdout, a bug on stderr, its exit code.
 *
 * output, Output: the streams of one call of the program, which take one answer or one bug.
 *
 * An answer sets process.exitCode and does not exit, so Node writes all of a piped answer before
 * it ends. A reader that left, such as `| true` or `| head -1`, closes the pipe: the write then
 * fails with EPIPE, and the call ends quietly with the exit code of its answer.
 *
 * An error that no call awaited can come before the answer or after it (decision 88). Before,
 * its bug is the answer, and the call's own answer is dropped; after, it goes to stderr only. So
 * stdout holds one JSON document. A listener on the process keeps Node from ending on such an
 * error, and an open timer would keep the program alive, so the first one ends it with exit 2
 * once both streams are written, and every later one writes nothing.
 *
 * @example const out = output(); out.answer(await call(shell, around()));
 */
import process from 'node:process';
export class Output {
    #answered = false;
    #ended = false;
    /** @param ran - the answer of the call, dropped once a bug ended the program */
    answer(ran) {
        if (this.#ended)
            return;
        this.#answered = true;
        process.exitCode = ran.exit;
        writeTo(process.stdout, ran.out);
        writeTo(process.stderr, ran.err);
    }
    /** @param ran - the answer of an error no call awaited; the program ends with exit 2 */
    bug(ran) {
        if (this.#ended)
            return;
        this.#ended = true;
        process.exitCode = 2;
        if (this.#answered === false)
            writeTo(process.stdout, ran.out);
        writeTo(process.stderr, ran.err);
        exitWhenWritten();
    }
    /** Ends the program at once with exit 2, for a bug that broke while it was answered. */
    stop() {
        process.exit(2);
    }
}
export const output = () => new Output();
/** Each stream gets its listener once, however many writes and calls it carries. */
const listened = new WeakSet();
function writeTo(stream, text) {
    if (listened.has(stream) === false)
        stream.on('error', ended);
    listened.add(stream);
    stream.write(text);
}
// A write calls back once all earlier writes of its stream are out, or once the stream failed.
function exitWhenWritten() {
    let open = 2;
    const written = () => {
        open -= 1;
        if (open === 0)
            process.exit(2);
    };
    process.stdout.write('', written);
    process.stderr.write('', written);
}
/**
 * A callback the runtime calls: a closed pipe is the reader's choice, any other failure to write
 * is a bug of the place the answer goes to, and stderr may be gone too, so the exit code says it.
 */
function ended(error) {
    if (isClosedPipe(error))
        return;
    process.exitCode = 2;
}
const isClosedPipe = (error) => 'code' in error && error.code === 'EPIPE';
