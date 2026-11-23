// The PDF of a .docx, set by LibreOffice. The body is oriko's own code and not shown: it starts
// the program soffice with a profile folder of its own, which adx neither runs nor sees.
import type { Issues } from '../core/issues.ts';

/** NOT_INSTALLED or CONVERSION_FAILED, both at `out`: the file the call asked for is a PDF. */
export declare function toPdf(docx: Uint8Array): Promise<Uint8Array | Issues<'out'>>;
