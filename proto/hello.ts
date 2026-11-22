import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: {
    greet: read({
      does: 'greets one person',
      input: z.object({ name: z.string().describe('who to greet') }),
      example: { name: 'Ada' },
      run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
    }),
  },
});

if (import.meta.main) await hello.main();
