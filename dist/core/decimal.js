/**
 * The one form of a number on the command line, so adx reads and writes numbers alike.
 *
 * isDecimal: whether a text is a plain decimal number: a sign, digits, and a fraction.
 *
 * argv reads only this form, never guesses; a step writes a number in it, or in --json when the
 * number has no such form, such as 1e21.
 *
 * @example const value = isDecimal(text) ? Number(text) : text;
 */
const DECIMAL = /^[+-]?\d+(\.\d+)?$/;
export const isDecimal = (text) => DECIMAL.test(text);
