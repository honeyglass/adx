export type HttpAnswer = {
    status: number;
    headers: object;
};
/**
 * @param error - any thrown value
 * @param pick - an answer for one error of the chain, or undefined to go on to its cause
 * @returns the first answer, or undefined when no error of the chain gives one
 */
export declare function firstIn<T>(error: unknown, pick: (link: object) => T | undefined): (T & ({} | null)) | undefined;
export declare const isHttpAnswer: (link: object) => link is HttpAnswer;
