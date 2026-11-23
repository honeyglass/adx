// The refusals of read.
//
// Two of oriko's codes get a name of their own here, because adx owns theirs: MISSING_INPUT for
// a call that names nothing to read, and MISSING_OPTION for --posting without --profile.
// POSTING_EXISTS is gone: files.write refuses a stored posting with adx's ALREADY_EXISTS.
import { code } from '@honeyglass/adx';

export const nothingToRead = code(
  'NOTHING_TO_READ',
  'fix',
  'Pass --posting, --notes or --resume with a file or an https:// address',
);
export const profileNeeded = code(
  'PROFILE_NEEDED',
  'fix',
  'Pass --profile beside --posting: a posting is stored beside its profile',
);

// oriko answers FILE_NOT_FOUND here today. adx owns that code, so this one has a name of its own.
export const noSource = code(
  'SOURCE_NOT_FOUND',
  'fix',
  'Check the path, or pass the full path of the file',
);

// A document oriko cannot turn into text.
export const unsupportedKind = code(
  'UNSUPPORTED_KIND',
  'fix',
  'Save it as PDF or as text, then pass that file',
);
export const unreadable = code(
  'DOCUMENT_UNREADABLE',
  'fix',
  'Open it, save it again without a password, and pass that file',
);
export const noText = code(
  'NO_TEXT',
  'fix',
  'Copy the text into a .txt or .md file and pass that file',
);

// A download the checks refuse, or that fails for good.
export const privateAddress = code(
  'PRIVATE_ADDRESS',
  'fix',
  'oriko loads only from the public internet; save the page and pass the file',
);
export const tooManyRedirects = code(
  'TOO_MANY_REDIRECTS',
  'fix',
  'Open it in a browser and pass the address it ends at, or save the page and pass the file',
);
export const encodingNotAllowed = code(
  'ENCODING_NOT_ALLOWED',
  'fix',
  'Save the page and pass the file',
);
export const httpStatus = code(
  'HTTP_STATUS',
  'fix',
  'Check the address, or save the page and pass the file',
);

// Raised by oriko's own code for files and downloads, under names adx owns. A tool cannot
// declare them, so they have no code() here (README, "What does not fit yet"):
// NOT_A_FILE, INPUT_TOO_LARGE, URL_NOT_ALLOWED, NETWORK_FAILED, SERVER_BUSY.
