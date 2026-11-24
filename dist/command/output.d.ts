import type { Issue, Token } from '../core/index.ts';
import type { Answered } from './answered.ts';
declare const FORMS: readonly [{
    readonly value: "text";
    readonly does: "text for a person";
}, {
    readonly value: "json";
    readonly does: "one JSON document for a program";
}];
export type Form = (typeof FORMS)[number]['value'];
/**
 * @param tokens - every token of the call
 * @param tool - the name of the tool, the first word of the call that lists the forms
 * @returns the tokens without --output and its value, and the form it forces; or the answer
 * that lists the forms; or the issues of a value outside the list and of a second --output
 */
export declare function formOf(tokens: readonly Token[], tool: string): {
    tokens: Token[];
    form: Form | undefined;
} | {
    answered: Answered;
} | {
    issues: [Issue, ...Issue[]];
};
export {};
