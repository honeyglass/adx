import type { Incoming } from '../core/index.ts';
type Answer = (method: string, path: string) => Promise<Incoming>;
/** @returns the address of the server, such as http://127.0.0.1:53211, and its close */
export declare function serve(answer: Answer): Promise<{
    url: string;
    close: () => void;
}>;
export {};
