import { code } from '@honeyglass/adx';

// oriko answers FILE_NOT_FOUND here today. adx owns that code, so this one has a name of its own.
export const noPicture = code(
  'NO_PICTURE',
  'fix',
  'Check the path of the picture, or pass its full path',
);
export const photoUnreadable = code(
  'PHOTO_UNREADABLE',
  'fix',
  'Use a PNG or JPEG file, for example with oriko photo set',
);
