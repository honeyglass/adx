// A tool whose files make one code twice in two ways and one code under a name of adx, as a
// program, since the codes of a process are one registry.
import { code, read, tool } from '@honeyglass/adx';

code('TWICE', 'fix', 'Do one thing');
code('TWICE', 'ask', 'Do another thing');
code('SCHEMA', 'fix', 'The name of one of adx');

const show = read({ does: 'shows', run: () => ({}) });

await tool({ name: 'codes', version: '0.1.0', does: 'x', commands: { show } }).main();
