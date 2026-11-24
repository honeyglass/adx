import { digestOf, keep, textAt } from "../node/index.js";
import { bareSchemaOf } from "../shapes/index.js";
import { formatsOf } from "../stored/index.js";
import { fingerprintsIn } from "./answer.schema.js";
import { FRONTMATTER_BYTES, STORED_FILE, STORED_FILE_BYTES } from "./limits.js";
/** The frontmatter of a skill: its first line, then `name` and `description`, then its end. */
const FRONTMATTER = /^---\r?\n(?:.*\r?\n)*?---\r?\n/;
/**
 * @param skill - the name the tool gives its skill
 * @param file - the path of its SKILL.md
 * @returns one finding per fact the skill fails, none when it is a skill
 */
export function skillFindings(skill, file) {
    const text = textAt(file, FRONTMATTER_BYTES);
    if (text === undefined)
        return [`the skill ${skill} has no file ${file}`];
    const head = FRONTMATTER.exec(text)?.[0] ?? '';
    const named = /^name:[ \t]*\S/m.test(head) && /^description:[ \t]*\S/m.test(head);
    return named
        ? []
        : [`${file} is no skill: it starts with no frontmatter with name and description`];
}
/** @returns one finding per format whose schema changed under its number */
export function storedFindings(folder, kinds) {
    const path = `${folder}/${STORED_FILE}`;
    const before = textAt(path, STORED_FILE_BYTES);
    const kept = fingerprintsIn(before);
    const prints = kinds.map(kind => ({ kind, now: fingerprintsOf(kind) }));
    const findings = prints.flatMap(({ kind, now }) => Object.entries(now)
        .filter(([version, print]) => (kept[kind.name]?.[version] ?? print) !== print)
        .map(([version]) => changed(kind, Number(version))));
    const all = {
        ...kept,
        ...Object.fromEntries(prints.map(({ kind, now }) => [kind.name, { ...now, ...kept[kind.name] }])),
    };
    const after = `${JSON.stringify(all, null, 2)}\n`;
    if (findings.length === 0 && after !== before)
        keep(path, after);
    return findings;
}
const fingerprintsOf = (kind) => Object.fromEntries(formatsOf(kind).map(({ version, shape }) => [
    `${version}`,
    digestOf(JSON.stringify(bareSchemaOf(shape))),
]));
function changed(kind, version) {
    if (version !== kind.version)
        return `${kind.name}: the schema of format ${version} changed, and files of format ${version} still hold the old one. Put it back.`;
    return `${kind.name}: the schema changed, but its version is still ${version}.\nRaise it to ${version + 1} and add .from(${version}, ...) for the old files.`;
}
