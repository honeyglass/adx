import { code } from '@honeyglass/adx';

export const noVar = code('VAR_NOT_FOUND', 'fix', 'Use a key the list command answers');
export const badHost = code('BAD_HOST', 'fix', 'Pass a host name only, such as shop.example.com');
export const hostTaken = code(
  'HOST_TAKEN',
  'fix',
  'Pick a host the environment does not serve yet',
);
