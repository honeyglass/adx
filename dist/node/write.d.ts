import type { Ran } from '../core/index.ts';
export declare class Output {
    #private;
    constructor();
    /** @param ran - the answer of the call, dropped once a bug ended the program */
    answer(ran: Ran): void;
    /** @param ran - the answer of an error no call awaited; the program ends with exit 2 */
    bug(ran: Ran): void;
    /** Ends the program at once with exit 2, for a bug that broke while it was answered. */
    stop(): void;
}
export declare const output: () => Output;
