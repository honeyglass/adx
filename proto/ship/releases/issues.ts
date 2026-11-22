import { code } from '@honeyglass/adx';

export const noRelease = code('RELEASE_NOT_FOUND', 'fix', 'Use a key the list command answers');
export const retired = code('RELEASE_RETIRED', 'fix', 'Promote a release that is built or live');
export const noPrevious = code('NO_PREVIOUS_RELEASE', 'fix', 'Promote the release you want');
