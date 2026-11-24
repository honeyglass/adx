/**
 * The escape of a character a terminal would act on, for text that leaves for a terminal.
 *
 * escaped: one character as `\u{…}`, its code point in hex.
 * oneLine: a text with its line breaks and tabs escaped, so it keeps to one line or column.
 *
 * The answer's text escapes every other control character where it leaves for the terminal; a
 * line break and a tab stay there, since the layout needs them, so a value that must keep to its
 * line escapes them itself.
 *
 * @example const row = `values  ${oneLine(values.join(', '))}`;
 */
export const escaped = (char) => `\\u{${(char.codePointAt(0) ?? 0).toString(16)}}`;
export const oneLine = (text) => text.replace(/[\n\t]/g, escaped);
