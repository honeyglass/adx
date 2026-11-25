/**
 * The Agent DX rules as the report of the test kit shows them: one line per rule, in the order
 * of the README, each made from the checks of conformance that cover it (decision 86).
 *
 * Outcome, RuleLine, ruleLines: what one check found, one line of the report, and all lines.
 *
 * Rule 7 needs to see which layer refused a call, 8 a judgement of the words of a hint, 9 a
 * write that fails halfway, and 11 a plan held against the file it writes. No probe does any of
 * them, so their lines say "not probed". So does a rule whose every check found nothing to
 * call, such as the dry runs of a tool without an effect: it met nothing, so it is not "met".
 * The skill is the author's (rule 6), so a tool without one has "none named", and one that
 * passes the check is "named", never "met" (decision 60).
 *
 * @example const lines = ruleLines(new Map([['raw JSON input', {}]]));
 */
/** What one check of conformance found: a failure, a todo, or neither, which meets its rule. */
export type Outcome = {
    failed?: {
        reason: string;
        next: string;
        findings: readonly string[];
    };
    /** Why the check did not run, or ran only in part, such as for a command with no example. */
    todo?: string;
    /** Why the check found nothing to call, such as no effect for the dry runs. */
    idle?: string;
    /** For a check of something a tool may lack, such as the skill: whether the tool has it. */
    subject?: boolean;
};
export type RuleLine = {
    rule: string;
    status: 'met' | 'failed' | 'not probed' | 'named' | 'none named';
    reason?: string;
};
/**
 * @param outcomes - the outcome of each check of conformance, by its name
 * @returns one line per rule: failed when a check failed, else not probed when one did not run
 * in full or every one found nothing to call, else met, or named and none named for the skill
 */
export declare function ruleLines(outcomes: ReadonlyMap<string, Outcome>): RuleLine[];
