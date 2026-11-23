// The two options most commands take, with the one text each has everywhere.
import { Id } from './cv.schema.ts';

export const cv = Id.optional().describe(
  'the name of one CV; may be left out when the data folder holds one CV or the profile names it',
);
export const profile = Id.optional().describe(
  'the name of one profile; it names its CV in its field cv',
);
