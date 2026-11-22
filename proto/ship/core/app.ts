// The app every command works on, and read, list and effect with that app typed into each handler.
import { z } from 'zod';
import { global, id } from '@honeyglass/adx';
import { appChoices } from './sources.ts';

export const app = global({
  input: z.object({ app: id().describe('the app key, such as shop-web') }),
  example: { app: 'shop-web' },
  values: { app: appChoices },
});

export const { read, list, effect } = app;
