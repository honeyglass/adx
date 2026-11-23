import { code } from '@honeyglass/adx';

// Both are for the person to solve, so both are of kind ask.
export const notInstalled = code(
  'NOT_INSTALLED',
  'ask',
  'Ask the person to install LibreOffice, then call again; without it, build a .docx and save it as PDF in Google Docs',
);
// oriko answers SYSTEM_REFUSED here today. adx owns that code, so this one has a name of its own.
export const conversionFailed = code(
  'CONVERSION_FAILED',
  'ask',
  'Tell the person what LibreOffice answered; a .docx saved as PDF in Google Docs works without it',
);
