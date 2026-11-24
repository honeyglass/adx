/**
 * What a handler writes with console while the test kit runs one call in its process.
 *
 * captured: the result of the work, and the lines console wrote to stdout and stderr meanwhile.
 *
 * The process has one console, so while a call runs it is replaced by one that writes into the
 * lines of the call it runs in, kept per call across awaits: two calls at once each get their
 * own lines. A line written outside every call goes to stdout or stderr, as before. The console
 * comes back once the last call ends.
 *
 * @example const { data, out, err } = await captured(() => call(spec, around));
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { Console } from 'node:console';
import process from 'node:process';
import { Writable } from 'node:stream';
import { $try } from '@honeyglass/utils/ts';

type Lines = { out: string[]; err: string[] };

const lines = new AsyncLocalStorage<Lines>();

/** How many calls capture now, and the console they replaced. */
const capturing = { calls: 0, original: globalThis.console };

/**
 * @param work - the call, which writes its answer itself and may log with console
 * @returns its result, and what console wrote to stdout and to stderr
 */
export async function captured<T>(work: () => Promise<T>) {
  const caught: Lines = { out: [], err: [] };
  if (capturing.calls === 0) {
    capturing.original = globalThis.console;
    globalThis.console = new Console({ stdout: sink('out'), stderr: sink('err') });
  }
  capturing.calls += 1;
  const { data, error } = await $try(() => lines.run(caught, work));
  capturing.calls -= 1;
  if (capturing.calls === 0) globalThis.console = capturing.original;
  if (error !== null) throw error;
  return { data, out: caught.out.join(''), err: caught.err.join('') };
}

const sink = (stream: keyof Lines) =>
  new Writable({
    decodeStrings: false,
    write(chunk: string, _encoding, done) {
      const call = lines.getStore();
      if (call === undefined) process[stream === 'out' ? 'stdout' : 'stderr'].write(chunk);
      else call[stream].push(chunk);
      done();
    },
  });
