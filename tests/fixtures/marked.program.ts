// A tool with a marker root, as a program: outside the test kit its walk goes up from the
// working directory, which roots.api.spec.ts names.
import { z } from 'zod';
import { dir, marker, read, root, tool } from '@honeyglass/adx';

const module = root('module', marker('go.mod'));

const walk = read({
  does: 'lists the Go files of a folder',
  input: z.object({ dir: dir(module) }),
  example: { dir: '.' },
  run: async ({ dir }) => {
    const found: string[] = [];
    for await (const file of dir.walk('.go')) found.push(file.rel);
    return { dir: dir.rel, found };
  },
});

await tool({
  name: 'marked',
  version: '0.1.0',
  does: 'x',
  roots: [module],
  commands: { walk },
}).main();
