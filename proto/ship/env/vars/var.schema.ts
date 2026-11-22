// One variable of an environment, as every command of vars/ reads it.
import { z } from 'zod';
import { id } from '@honeyglass/adx';

export const Var = z.object({
  key: id().describe('the variable, such as PAYMENT_URL'),
  value: z.string().describe('its value; a secret answers ***'),
  secret: z.boolean().describe('whether the value is hidden'),
  updated: z.string().describe('when it last changed, ISO 8601'),
});
