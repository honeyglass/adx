// The refusals of the commands that live in cli/. The mistakes of a call itself, such as an
// unknown option or command, are adx's own codes and need no line here.
import { code } from '@honeyglass/adx';

export const wrongExtension = code(
  'WRONG_EXTENSION',
  'fix',
  'Use a file name that ends in .docx, or in .pdf when LibreOffice is installed',
);
export const creditsNeedTerminal = code(
  'CREDITS_NEED_TERMINAL',
  'fix',
  'Add --style terminal, or leave out --credits',
);
