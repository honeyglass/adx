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
/** The 16 rules of the README, each with the checks of conformance that cover it. */
const RULES = [
    { rule: 'Raw JSON input', checks: ['raw JSON input'] },
    { rule: 'Schema at run time', checks: ['schema at run time'] },
    { rule: 'JSON when piped', checks: ['JSON when piped'] },
    { rule: 'Input hardening', checks: ['input hardening'] },
    { rule: 'Dry runs', checks: ['dry runs', '--replace'] },
    { rule: 'Agent skill', checks: ['agent skill'] },
    { rule: 'Checks in layers', checks: [], unprobed: 'no probe tells which layer refused a call' },
    {
        rule: 'Errors with a hint',
        checks: [],
        unprobed: 'no probe judges whether a hint says what to change',
    },
    { rule: 'All or nothing', checks: [], unprobed: 'no probe makes a write fail halfway' },
    { rule: 'Exit codes 0, 1, 2', checks: ['exit codes'] },
    {
        rule: 'Plan before the file',
        checks: [],
        unprobed: 'no probe compares a plan with the file it writes',
    },
    { rule: 'Hints that run', checks: ['values outside a list', 'hints that run'] },
    { rule: 'Options that list', checks: ['options that list'] },
    { rule: 'Next steps', checks: ['start answer'] },
    { rule: 'Nothing passes silently', checks: ['nothing passes silently'] },
    { rule: 'Context discipline', checks: ['large answers'] },
];
/**
 * @param outcomes - the outcome of each check of conformance, by its name
 * @returns one line per rule: failed when a check failed, else not probed when one did not run
 * in full or every one found nothing to call, else met, or named and none named for the skill
 */
export function ruleLines(outcomes) {
    return RULES.map(rule => lineOf(rule, outcomes));
}
function lineOf({ rule, checks, unprobed }, outcomes) {
    if (unprobed !== undefined)
        return { rule, status: 'not probed', reason: unprobed };
    const found = checks.map(check => ({ check, outcome: outcomes.get(check) }));
    const failed = found.find(({ outcome }) => outcome?.failed !== undefined)?.outcome?.failed;
    if (failed !== undefined)
        return { rule, status: 'failed', reason: failed.reason };
    const missing = found.find(({ outcome }) => outcome === undefined);
    if (missing !== undefined)
        return { rule, status: 'not probed', reason: `${missing.check} did not run` };
    const todo = found.find(({ outcome }) => outcome?.todo !== undefined)?.outcome?.todo;
    if (todo !== undefined)
        return { rule, status: 'not probed', reason: todo };
    const [idle] = found.map(({ outcome }) => outcome?.idle);
    const idleAll = found.every(({ outcome }) => outcome?.idle !== undefined);
    if (idleAll && idle !== undefined)
        return { rule, status: 'not probed', reason: idle };
    const subject = found.find(({ outcome }) => outcome?.subject !== undefined)?.outcome?.subject;
    if (subject === undefined)
        return { rule, status: 'met' };
    return { rule, status: subject ? 'named' : 'none named' };
}
