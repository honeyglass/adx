/**
 * The errors of a program that no call awaited, caught at the level of the process.
 *
 * catchLost: hands each uncaught exception and unhandled rejection to the program.
 *
 * Node ends such an error with exit 1, and rule 10 asks 2 for a bug (decision 88). Only main()
 * calls it: the test kit's run() and invoke() run in the process of a test, whose errors are the
 * test's, so they leave the process as they found it. The process has one pair of listeners,
 * however often main() runs, and they hand each error to the latest main().
 *
 * @example catchLost(error => lost(out, shell, around, error));
 */
import process from 'node:process';

type Lost = (error: unknown) => void;

/** The one program the listeners serve; the process is one, so is its catch. */
const program: { lost?: Lost } = {};

/** @param lost - what the program does with the error, which the process then no longer ends on */
export function catchLost(lost: Lost) {
  if (program.lost === undefined) {
    process.on('uncaughtException', error => program.lost?.(error));
    process.on('unhandledRejection', error => program.lost?.(error));
  }
  program.lost = lost;
}
