/**
 * The check "agent skill": the skill a tool names, found by its name where Claude Code looks.
 *
 * skillFailure: why the skill fails the check, or undefined when it passes (decisions 7 and 82).
 * Failure: the reason, the next step and the findings of a check that reads files.
 *
 * The test names the file in samples.skillFile. The kit copies it into a fresh scratch home at
 * `.claude/skills/<name>/SKILL.md` and finds it there by its name, as Claude Code does with that
 * home; the HOME of the test stays as it is, and the scratch home goes after the check, whatever
 * it found. The kit reads only the start of the file: a frontmatter with `name` and
 * `description`. A name passes only in the form of a skill name, since it becomes part of the
 * path.
 *
 * @example const failure = skillFailure('hello', samples.skillFile);
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { placeSkill, scratch, skillAt, textAt } from "../node/index.js";
import { SKILL_NAME } from "../tool/index.js";
import { FRONTMATTER_BYTES } from "./limits.js";
/** The frontmatter of a skill: its first line, then `name` and `description`, then its end. */
const FRONTMATTER = /^---\r?\n(?:.*\r?\n)*?---\r?\n/;
/**
 * @param skill - the name the tool gives its skill
 * @param file - samples.skillFile, relative to the working folder of the test
 * @returns why the skill fails, or undefined when it is a skill
 */
export function skillFailure(skill, file) {
    if (SKILL_NAME.test(skill) === false)
        return misnamed(skill);
    if (file === undefined)
        return unnamed(skill);
    const read = placedText(skill, file);
    if (read.error !== null) {
        return fileFailure(file, [`samples.skillFile ${file} cannot be read: ${String(read.error)}`]);
    }
    if (read.data === undefined)
        return fileFailure(file, [`samples.skillFile ${file} is no file`]);
    const head = FRONTMATTER.exec(read.data)?.[0] ?? '';
    const named = /^name:[ \t]*\S/m.test(head) && /^description:[ \t]*\S/m.test(head);
    if (named)
        return undefined;
    return fileFailure(file, [
        `the SKILL.md of ${skill} starts with no frontmatter with name and description`,
    ]);
}
// Every failure of the copy, such as EACCES or a file gone since it was found, means the same:
// the kit cannot read the file. The scratch home goes on every path.
function placedText(skill, file) {
    const made = scratch(undefined);
    const read = trySync$(() => placeSkill(file, made.home, skill)
        ? (textAt(skillAt(made.home, skill), FRONTMATTER_BYTES) ?? '')
        : undefined);
    made.remove();
    return read;
}
const fileFailure = (file, findings) => ({
    reason: `the SKILL.md at ${file} is no skill the kit can read`,
    next: 'name in samples.skillFile a SKILL.md that starts with a frontmatter with name and description',
    findings,
});
const misnamed = (skill) => ({
    reason: `the skill name ${JSON.stringify(skill)} cannot name a folder under ~/.claude/skills/`,
    next: 'rename the skill in tool(): lowercase letters, digits and -, at most 64 characters',
    findings: [`the skill ${JSON.stringify(skill)} has no name of lowercase letters, digits and -`],
});
const unnamed = (skill) => ({
    reason: `the tool names the skill ${skill}, and the samples name no SKILL.md`,
    next: "name the repository's SKILL.md in samples.skillFile, relative to the test's working folder",
    findings: [`the tool names the skill ${skill}, and samples.skillFile names no SKILL.md`],
});
