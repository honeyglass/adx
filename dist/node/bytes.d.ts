/**
 * The size of a text in the bytes of UTF-8, as stdout carries it.
 *
 * byteLength: that size, for the test kit's checks of an answer's size.
 *
 * @example if (byteLength(out) > LARGE_ANSWER) return [`${line} answers ${byteLength(out)} bytes`];
 */
export declare const byteLength: (text: string) => number;
