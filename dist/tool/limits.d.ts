/**
 * The constants of tool/.
 *
 * SKILL_NAME: the form of the name a tool gives its skill (decision 82).
 *
 * @example if (SKILL_NAME.test(shell.skill) === false) return [declaration.issue(message)];
 */
/**
 * Lowercase letters, digits and hyphens, from a letter or digit on, at most 64 characters: the
 * form Claude Code gives skill names. An allow-list, since the name becomes a folder under
 * `~/.claude/skills/`, so no `/`, `.` or other sign reaches the path.
 */
export declare const SKILL_NAME: RegExp;
