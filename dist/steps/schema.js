const names = new WeakMap();
function schemaStep(does, name) {
    const step = { does };
    names.set(step, name);
    return step;
}
export const schema = {
    /** @param name - a shape of the tool's `shapes`, or a command by its words, such as `profile set` */
    step: (name) => schemaStep(`shows the schema of ${name}`, name),
};
export const everySchema = schemaStep('shows every command and its input', '');
export const schemaNameOf = (step) => names.get(step);
