import { z } from 'zod';
import { list, paged } from '@honeyglass/adx';
import { Id, Language } from '../core/cv.schema.ts';
import { cvNames } from '../core/home.ts';
import { noCv } from '../core/issues.ts';
import { show } from './show.ts';

const Listed = z.object({
  name: Id.describe('the name of the CV'),
  language: Language.optional().describe('its language, such as en'),
  person: z.string().optional().describe('the first and the last name'),
  fits: z.boolean().describe('whether it fits its pages'),
  pages: z.number().optional().describe('the pages it fills, when it fits'),
  issues: z.array(z.string()).optional().describe('the codes of what keeps it from fitting'),
});

/** One CV as the list shows it: checked and placed, and never refused for what it lacks. */
declare function listed(name: string): Promise<z.output<typeof Listed>>;

export const cvs = list({
  does: 'lists the CVs and whether each fits its pages',
  item: Listed,
  key: 'name',
  outline: ['language', 'person', 'fits', 'pages', 'issues'],
  run: async (_, { page, refuse }) => {
    const names = await cvNames();
    if (names.length === 0) return refuse(noCv.issue('The data folder holds no CV'));
    return paged(await Promise.all(names.map(listed)), page);
  },
  // With one CV the step names it; with several the caller picks one.
  next: ({ items: [only, ...more] }) =>
    more.length === 0 && only !== undefined
      ? [show.step({ cv: only.name })]
      : [show.step().needs('cv')],
});
