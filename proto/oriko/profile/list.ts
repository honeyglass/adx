import { z } from 'zod';
import { list, paged } from '@honeyglass/adx';
import { Id } from '../core/cv.schema.ts';
import { cvNames, profileNames } from '../core/home.ts';
import { noCv } from '../core/issues.ts';

const Listed = z.object({
  name: Id.describe('the name of the profile'),
  cv: Id.optional().describe('the CV it belongs to'),
  fits: z.boolean().describe('whether the CV fits its pages with it'),
  pages: z.number().optional().describe('the pages it fills, when it fits'),
  issues: z.array(z.string()).optional().describe('the codes of what keeps it from building'),
});

/** One profile as the list shows it: applied to its CV and placed, and never refused. */
declare function listed(name: string): Promise<z.output<typeof Listed>>;

// The step after it, plan, lies in cli/ and stands in cli/next.ts.
export const profiles = list({
  does: 'lists the profiles and whether each fits its pages',
  item: Listed,
  key: 'name',
  outline: ['cv', 'fits', 'pages', 'issues'],
  run: async (_, { page, refuse }) => {
    if ((await cvNames()).length === 0) return refuse(noCv.issue('The data folder holds no CV'));
    return paged(await Promise.all((await profileNames()).map(listed)), page);
  },
});
