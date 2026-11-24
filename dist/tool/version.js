/** @returns whether the call is --version alone, without a value */
export function namesVersion(tokens) {
    const [token, ...more] = tokens;
    return (more.length === 0 &&
        token?.kind === 'option' &&
        token.name === 'version' &&
        token.inlineValue !== true);
}
/** @returns the version as the result, which a person at a terminal reads alone on its line */
export const versionAnswer = (shell) => ({
    answer: { ok: true, result: shell.version },
});
