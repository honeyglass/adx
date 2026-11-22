// One ticket, as the server answers it. Five commands read it, so it has a file.
import { z } from 'zod';
import { id, multiline } from '@honeyglass/adx';

export const Ticket = z.object({
  id: id().describe('the ticket key, such as CW-112'),
  title: z.string().describe('the one-line title'),
  state: z.enum(['open', 'closed']).describe('open or closed'),
  labels: z.array(z.string()).describe('the labels'),
  body: multiline().describe('the description, Markdown'),
});
