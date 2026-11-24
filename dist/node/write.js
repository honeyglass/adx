/**
 * What one call of the program leaves: its answer on stdout, a bug on stderr, its exit code.
 *
 * write: writes both streams and sets the exit code.
 *
 * It sets process.exitCode and does not exit, so Node writes all of a piped answer before it ends.
 * A reader that left, such as `| true` or `| head -1`, closes the pipe: the write then fails
 * with EPIPE, and the call ends quietly with the exit code of its answer.
 *
 * @example write(await call(spec, around()));
 */
import process from 'node:process';
export function write(ran) {
    process.exitCode = ran.exit;
    writeTo(process.stdout, ran.out);
    writeTo(process.stderr, ran.err);
}
function writeTo(stream, text) {
    stream.on('error', ended);
    stream.write(text);
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
