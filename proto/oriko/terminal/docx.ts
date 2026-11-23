import type { Master } from '../core/cv.schema.ts';
import type { Plan } from '../core/place.ts';

/** The terminal look as a .docx: the pages of the preview, set in a fixed-width font. */
export declare function renderTerminal(cv: Master, plan: Plan): Promise<Uint8Array>;
