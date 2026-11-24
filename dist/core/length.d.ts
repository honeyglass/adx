/**
 * The length of a text in characters, as a person counts them, not in UTF-16 units.
 *
 * codePointsIn: the number of code points, so an emoji counts once.
 *
 * @example if (codePointsIn(text) > STDIN_LIMIT) return refused(tooLarge);
 */
export declare function codePointsIn(text: string): number;
