import type { Step, Writer } from '../core/index.ts';
/**
 * `replace` is what the command declares; `replacing` whether the call said --replace; `retry`
 * the call again with --replace --dry-run, for the issue of a taken file.
 */
export type Replace = {
    replace: false | 'always' | undefined;
    replacing: boolean;
    retry: () => Step;
};
/** @param call - what the command and the call say about replacing */
export declare const staging: (call: Replace) => Writer;
