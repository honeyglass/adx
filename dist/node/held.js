/**
 * What a program of the test kit holds open, so a signal does not leave it behind.
 *
 * hold: registers what closes a thing, such as a scratch folder or the group of a checked
 * program, and answers the function that closes it once and forgets it.
 * endOnSignals: on SIGINT or SIGTERM closes everything held, the newest first, and ends.
 *
 * Only adxcheck calls endOnSignals: a test runner owns the signals of its own process.
 *
 * @example const release = hold(() => rmSync(folder, { recursive: true, force: true }));
 */
import process from 'node:process';
import { trySync$ } from '@honeyglass/utils/ts';
/** The one table of the process, since a signal comes to the process. */
const held = new Set();
/** Exit codes of a program a signal ended, as a shell reports them: 128 and the signal. */
const SIGNALS = [
    ['SIGINT', 130],
    ['SIGTERM', 143],
];
/** @param close - what closes the thing; it runs once, by release or by a signal */
export function hold(close) {
    held.add(close);
    return () => {
        if (held.delete(close))
            close();
    };
}
export function endOnSignals() {
    for (const [signal, code] of SIGNALS)
        process.once(signal, () => ended(code));
}
// A callback the runtime calls: each close runs, whatever an earlier one did, then the end.
function ended(code) {
    for (const close of [...held].reverse()) {
        held.delete(close);
        trySync$(close);
    }
    process.exit(code);
}
