import type { Auth, Remote } from '../core/index.ts';
export declare function remote(name: string, at: {
    url: string;
    auth?: Auth;
}): Remote;
