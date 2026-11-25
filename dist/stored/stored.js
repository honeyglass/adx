/**
 * A kind of stored data with the number of its format, and the step up from each older format.
 *
 * stored: the kind, which writes its number into every text and reads an older text converted.
 * formatsOf, isFormatNumber: the formats of a kind, in the order it declares them, and whether a
 * value is a format number, for the start checks.
 *
 * The text of an item is one JSON object with `"version"` beside the fields; a text without it
 * is format 1. A read converts in memory only, so the file keeps its format until a write.
 * A text the kind cannot read is the person's to fix; a step up that answers no item of the
 * current format is the tool's bug. Nothing is checked when a kind is made: it is made when its
 * file loads, and the tool checks the kinds it lists at the start of every call. A read or a write
 * inside a call of a kind its tool does not list is refused, as unlisted() in core says
 * (decision 37).
 *
 * @example const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, toV2);
 */
import { shown, trySync$ } from '@honeyglass/utils/ts';
import { aboutText, declaration, newerVersion, NOTHING_CHANGED, refusedWith, storedInvalid, unlisted, } from "../core/index.js";
class Kind {
    name;
    version;
    formats;
    #up;
    constructor(name, formats, up) {
        this.name = name;
        this.version = formats[0].version;
        this.formats = formats;
        this.#up = up;
    }
    from(version, shape, up) {
        const toCurrent = (old) => this.#up(up(old));
        return new Kind(this.name, [...this.formats, formatOf(version, shape, toCurrent)], toCurrent);
    }
    // The number of the kind wins over a `version` the value carries, and stands first.
    stringify(value) {
        const refusal = unlisted(this, 'writes');
        if (refusal !== undefined)
            throw refusal;
        return JSON.stringify(Object.assign({ version: this.version }, value, { version: this.version }));
    }
    parse(text) {
        const { name } = this;
        const refusal = unlisted(this, 'reads');
        if (refusal !== undefined)
            throw refusal;
        const json = trySync$(() => JSON.parse(text));
        if (json.error !== null)
            throw unreadable(name, of => storedInvalid.issue(`${of} holds no JSON`), json.error);
        const { version, fields } = numbered(json.data);
        if (isNewer(version, this.version))
            throw unreadable(name, of => newerVersion.issue(newer(of, version, this.version)));
        if (isFormatNumber(version) === false)
            throw unreadable(name, of => storedInvalid.issue(`${of} has the version ${JSON.stringify(version)}`));
        const format = this.formats.find(declared => declared.version === version);
        if (format === undefined)
            throw unreadable(name, of => storedInvalid.issue(`${of} is of format ${version}, which the tool does not declare`));
        const read = format.read(fields);
        if ('failure' in read)
            throw unreadable(name, of => storedInvalid.issue(`${of} of format ${version} fails its schema ${read.failure}`));
        return format === this.formats[0] ? read.data : this.#current(read.data, version);
    }
    // The steps up are the tool's code, so an item they answer is checked like a stored one.
    #current(value, from) {
        const checked = this.formats[0].read(value);
        if ('data' in checked)
            return checked.data;
        const message = `the step up from format ${from} of the stored kind ${this.name} answers no ${this.name} of format ${this.version}: ${checked.failure}`;
        throw refusedWith([declaration.issue(message)], NOTHING_CHANGED);
    }
}
export function stored(name, version, shape) {
    const same = (value) => value;
    return new Kind(name, [formatOf(version, shape, same)], same);
}
/** A kind made some other way than with stored() has no formats adx can check. */
export const formatsOf = (kind) => kind instanceof Kind ? kind.formats : [];
export const isFormatNumber = (version) => typeof version === 'number' && Number.isSafeInteger(version) && version >= 1;
// The step up runs on fields that passed the schema of their format only.
function formatOf(version, shape, toCurrent) {
    return {
        version,
        shape,
        read: fields => {
            const checked = shape.safeParse(fields);
            if (checked.success)
                return { data: toCurrent(checked.data) };
            const [first] = checked.error.issues;
            return { failure: `at ${shown(first?.path.join('.') ?? '')}: ${first?.message}` };
        },
    };
}
// The number stands beside the fields, so the schema of a format never sees it.
function numbered(json) {
    const isObject = typeof json === 'object' && json !== null;
    if (isObject && 'version' in json) {
        const { version, ...fields } = json;
        return { version, fields };
    }
    return { version: 1, fields: json };
}
// Any number above the current one is a newer format, also one too large to be exact.
const isNewer = (version, current) => typeof version === 'number' && Number.isFinite(version) && version > current;
const newer = (of, version, current) => `${of} is of format ${version}, and the tool reads format ${current} at most`;
// The text names no file; the reader of a file says the refusal again of it.
function unreadable(name, issueOf, cause) {
    const said = (of) => refusedWith([issueOf(of)], NOTHING_CHANGED, cause);
    return aboutText(said(`a stored ${name}`), file => said(`the ${name} file ${shown(file)}`));
}
