// A tool with one read that declares its answer and takes no input, as a program: most probes
// find nothing to call in it.
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';

const count = read({
  does: 'counts the friends',
  output: z.object({ friends: z.number() }),
  run: () => ({ friends: 0 }),
});

await tool({ name: 'idle', version: '0.1.0', does: 'counts', commands: { count } }).main();
