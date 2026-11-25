/**
 * What one program leaves: its answer on stdout, a bug on stderr, its exit code.
 *
 * output, Output: the streams of one call of the program, which take one answer or one bug.
 *
 * An answer sets process.exitCode and does not exit, so Node writes all of a piped answer before
 * it ends. A reader that left, such as `| true` or `| head -1`, closes the pipe: the write then
 * fails with EPIPE, and the call ends quietly with the exit code of its answer.
 *
 * stdout holds the answer and nothing else (decision 91): from the moment output() is made until
 * the answer is written, every other write to stdout, console.log among them, goes to stderr, and
 * only the answer goes through stdout's own write, so a second call of one process has stdout
 * back. A write to the file descriptor itself is not seen.
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
import type { Writable } from 'node:stream';
import type { Ran } from '../core/index.ts';

export class Output {
  #answered = false;
  #ended = false;
  /** stdout's own write, which only the answer takes, and which it gets back after the answer. */
  readonly #own = process.stdout.write;
  readonly #stdout = this.#own.bind(process.stdout);

  constructor() {
    process.stdout.write = process.stderr.write.bind(process.stderr);
  }

  /** @param ran - the answer of the call, dropped once a bug ended the program */
  answer(ran: Ran) {
    if (this.#ended) return;
    this.#answered = true;
    process.exitCode = ran.exit;
    writeTo(process.stdout, ran.out, this.#stdout);
    writeTo(process.stderr, ran.err);
    process.stdout.write = this.#own;
  }

  /** @param ran - the answer of an error no call awaited; the program ends with exit 2 */
  bug(ran: Ran) {
    if (this.#ended) return;
    this.#ended = true;
    process.exitCode = 2;
    if (this.#answered === false) writeTo(process.stdout, ran.out, this.#stdout);
    writeTo(process.stderr, ran.err);
    exitWhenWritten(this.#stdout);
  }

  /** Ends the program at once with exit 2, for a bug that broke while it was answered. */
  stop() {
    process.exit(2);
  }
}

export const output = () => new Output();

type Write = (text: string, encoding?: undefined, done?: () => void) => boolean;

/** Each stream gets its listener once, however many writes and calls it carries. */
const listened = new WeakSet<Writable>();

function writeTo(stream: Writable, text: string, write: Write = stream.write.bind(stream)) {
  if (listened.has(stream) === false) stream.on('error', ended);
  listened.add(stream);
  write(text);
}

// A write calls back once all earlier writes of its stream are out, or once the stream failed.
function exitWhenWritten(stdout: Write) {
  let open = 2;
  const written = () => {
    open -= 1;
    if (open === 0) process.exit(2);
  };
  stdout('', undefined, written);
  process.stderr.write('', written);
}

/**
 * A callback the runtime calls: a closed pipe is the reader's choice, any other failure to write
 * is a bug of the place the answer goes to, and stderr may be gone too, so the exit code says it.
 */
function ended(error: Error) {
  if (isClosedPipe(error)) return;
  process.exitCode = 2;
}

const isClosedPipe = (error: Error) => 'code' in error && error.code === 'EPIPE';
