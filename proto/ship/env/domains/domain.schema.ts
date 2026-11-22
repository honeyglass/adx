// One host name of an environment, as both commands of domains/ read it.
import { z } from 'zod';

export const Domain = z.object({
  host: z.string().describe('the host name, such as shop.example.com'),
  tls: z.enum(['pending', 'ready']).describe('whether its certificate is issued'),
});
