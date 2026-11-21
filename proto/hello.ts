import { z } from 'zod';
import { tool } from '@honeyglass/adx';

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
});

hello.read({
  name: 'greet',
  does: 'greets one person',
  input: z.object({ name: z.string().describe('who to greet') }),
  example: { name: 'Ada' },
  run: ({ name }) => ({ greeting: `Hello, ${name}!` }),
});

if (import.meta.main) await hello.main();
