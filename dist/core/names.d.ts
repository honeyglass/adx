/** Each form, what its name is called, and the words that say the form. */
declare const FORMS: {
    readonly tool: {
        readonly form: RegExp;
        readonly called: "the tool name";
        readonly says: "lowercase letters, digits and -, of at most 64 characters";
    };
    readonly root: {
        readonly form: RegExp;
        readonly called: "the root";
        readonly says: "letters, digits and -, not first";
    };
    readonly kind: {
        readonly form: RegExp;
        readonly called: "the stored kind";
        readonly says: "letters, digits and -, not first";
    };
    readonly code: {
        readonly form: RegExp;
        readonly called: "the code";
        readonly says: "capital letters, digits and _, from a letter on";
    };
    readonly variable: {
        readonly form: RegExp;
        readonly called: "the variable";
        readonly says: "letters, digits and _, not a digit first";
    };
};
/** @returns a DECLARATION issue for a name without the form of its kind, else undefined */
export declare function nameIssue(kind: keyof typeof FORMS, name: string): import("./issue.ts").Issue<never> | undefined;
export {};
