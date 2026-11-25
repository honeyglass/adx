export declare const skillAt: (home: string, name: string) => string;
/**
 * @param file - the SKILL.md, relative to the working folder of the test
 * @param home - the home it goes into
 * @param name - the name of the skill
 * @returns false for a file that is no file, and nothing is copied
 */
export declare function placeSkill(file: string, home: string, name: string): boolean;
