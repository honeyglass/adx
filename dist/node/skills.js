/**
 * A skill where Claude Code looks for it: `<home>/.claude/skills/<name>/SKILL.md`.
 *
 * skillAt: the path of a skill by its name under a home.
 * placeSkill: a SKILL.md copied to that place, as a tool's install puts it there.
 *
 * The home is the one the caller names, such as a scratch home of the test kit; neither function
 * reads HOME. The name must be a skill name already, since it becomes part of the path.
 *
 * @example placeSkill('SKILL.md', made.home, 'hello'); textAt(skillAt(made.home, 'hello'), 4096);
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
export const skillAt = (home, name) => join(home, '.claude', 'skills', name, 'SKILL.md');
/**
 * @param file - the SKILL.md, relative to the working folder of the test
 * @param home - the home it goes into
 * @param name - the name of the skill
 * @returns false for a file that is no file, and nothing is copied
 */
export function placeSkill(file, home, name) {
    const source = resolve(file);
    if (existsSync(source) === false || statSync(source).isFile() === false)
        return false;
    const target = skillAt(home, name);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    return true;
}
