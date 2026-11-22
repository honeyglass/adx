// One environment, as releases/ and env/ both read it.
import { z } from 'zod';
import { id } from '@honeyglass/adx';

export const Env = z.object({
  name: id().describe('the environment, such as staging'),
  url: z.string().describe('where it is served'),
  release: z.string().optional().describe('the release that is live there'),
  previous: z.string().optional().describe('the release that was live before'),
  frozen: z.boolean().describe('whether changes are held'),
});
