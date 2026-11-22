// Guide, "Wrapping a remote API". What the features share: the server, and the project of a call.
import { z } from 'zod';
import { bearer, envUrl, global, id, remote } from '@honeyglass/adx';

export const api = remote('tracker', {
  url: envUrl('TRACKER_URL', 'https://tracker.example.com/api'),
  auth: bearer('TRACKER_TOKEN'),
});

export const Named = z.array(z.object({ name: z.string(), description: z.string().default('') }));

const projects = async () =>
  (await api.get(['projects'], Named)).map(p => ({
    value: p.name,
    does: p.description,
  }));

export const project = global({
  input: z.object({
    project: id().describe('the project key, such as checkout-web'),
  }),
  example: { project: 'checkout-web' },
  values: { project: projects },
});

// read, list and effect, with the project typed into every handler
export const { read, list, effect } = project;
