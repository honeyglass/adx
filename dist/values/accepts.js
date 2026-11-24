/**
 * Whether the source of a field would take a value that a step of a refusal carries (decision 79).
 *
 * accepts: the answer, true only when the source can check the value and takes it.
 *
 * A value stays out of the step when adx cannot check it: a source that needs another field
 * first, a source that refuses, and a key of a list, whose keys adx does not read.
 *
 * @example if (await accepts(command, 'cv', 'jane', beside)) carried.set('cv', 'jane');
 */
import { $try, RefusalError } from '@honeyglass/utils/ts';
import { asked } from "./ask.js";
import { isListed, judged } from "./outside.js";
/**
 * A refusal of a source, such as a busy server, is an answer adx cannot check by: the value stays
 * out, and the refusal being answered stands. Any other error, and a refusal of kind bug, is a bug
 * of the tool and flies on (decision 76).
 *
 * @param command - the command the step names
 * @param field - the field the step carries
 * @param value - the value of the refused call, which passed the field's schema
 * @param beside - the other fields the real call would hold, as given and checked
 * @returns whether the source takes the value; true for a field without a source
 */
export async function accepts(command, field, value, beside) {
    const { data: answer, error } = await $try(() => askedBeside(command, field, beside));
    if (error instanceof RefusalError && error.kind !== 'bug')
        return false;
    if (error !== null)
        throw error;
    switch (answer.kind) {
        case 'choices':
            return Array.isArray(value)
                ? value.every(item => isListed(item, answer.choices))
                : isListed(value, answer.choices);
        case 'taken':
            return (isListed(value, answer.names.map(name => ({ value: name }))) === false);
        case 'none':
            return true;
        default:
            return false;
    }
}
// The fields beside it reach the source only once they stand in their own lists.
async function askedBeside(command, field, beside) {
    const { accepted } = await judged(command, beside);
    return asked(field, command.sourceOf(field), accepted);
}
