import type { Path } from './issue.ts';
export declare const unknownCommand: import("./code.ts").Code;
export declare const optionBeforeCommand: import("./code.ts").Code;
export declare const unknownOption: import("./code.ts").Code;
export declare const schemaFailed: import("./code.ts").Code;
export declare const unexpectedArgument: import("./code.ts").Code;
export declare const missingValue: import("./code.ts").Code;
export declare const unexpectedValue: import("./code.ts").Code;
export declare const repeatedOption: import("./code.ts").Code;
export declare const invalidJson: import("./code.ts").Code;
export declare const missingInput: import("./code.ts").Code;
export declare const inputTooLarge: import("./code.ts").Code;
export declare const notInList: import("./code.ts").Code;
/**
 * An enum and a source of `values` both refuse a value with it, so both say it alike.
 *
 * @param path - the field, and the index of the value when the field holds a list
 * @param value - the value as the call gave it
 * @returns the issue, which names the value as JSON
 */
export declare const notInListAt: (path: Path<string>, value: unknown) => import("./issue.ts").Issue<string>;
export declare const pathOutside: import("./code.ts").Code;
export declare const fileNotFound: import("./code.ts").Code;
export declare const notAFile: import("./code.ts").Code;
export declare const notAFolder: import("./code.ts").Code;
/** Its issues say per file whether --replace helps, since a command may not take it. */
export declare const alreadyExists: import("./code.ts").Code;
export declare const urlNotAllowed: import("./code.ts").Code;
export declare const rootNotFound: import("./code.ts").Code;
export declare const envMissing: import("./code.ts").Code;
export declare const storedInvalid: import("./code.ts").Code;
export declare const newerVersion: import("./code.ts").Code;
export declare const declaration: import("./code.ts").Code;
export declare const systemRefused: import("./code.ts").Code;
export declare const networkFailed: import("./code.ts").Code;
export declare const serverBusy: import("./code.ts").Code;
export declare const accessRefused: import("./code.ts").Code;
export declare const remoteRefused: import("./code.ts").Code;
export declare const unknownError: import("./code.ts").Code;
/** In the order of the guide's list of adx's codes: those of kind fix, then ask, retry, bug. */
export declare const ADX_CODES: import("./code.ts").Code[];
