import { code } from '@honeyglass/adx';

// A profile show for a name with neither a profile nor a posting.
export const nothingStored = code(
  'UNKNOWN_PROFILE',
  'fix',
  'Use one of the profile names the command lists',
);
