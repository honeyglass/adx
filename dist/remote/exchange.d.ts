import type { z } from 'zod';
import type { Act, Remote, Request } from '../core/index.ts';
type Path = readonly (string | number)[];
type Query = Record<string, string | number | undefined>;
type On = {
    readonly [status: number]: unknown;
};
type Parts = {
    remote: Remote;
    path: Path;
    body: unknown;
};
/**
 * @param method - the method of the request
 * @param parts - the remote that sends it, the path and the body
 * @returns the request, which only act.send sends
 */
export declare function request(method: Request['method'], parts: Parts): Request;
/**
 * @param remote - the remote that reads
 * @param path - the parts of the path
 * @param answer - the schema of the answer
 * @param options - the query, and a value for each status that is no failure here
 * @returns the checked answer, or the value of a status `on` names
 * @throws a refusal of the request, kind by the guide's table, after the last try
 */
export declare function read<S extends z.ZodType, O extends On>(remote: Remote, path: Path, answer: S, options: {
    query?: Query;
    on?: O;
}): Promise<z.output<S> | O[keyof O]>;
export declare const act: Act;
export {};
