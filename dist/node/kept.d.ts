/** @returns the first bytes of the file up to the limit, as text, or undefined for no file */
export declare function textAt(path: string, limit: number): string | undefined;
export declare const keep: (path: string, text: string) => void;
export declare const digestOf: (text: string) => string;
