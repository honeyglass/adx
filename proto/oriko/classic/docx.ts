// The classic look: the CV as a .docx. The body is oriko's own code, 609 lines today, and not shown.
import type { Master } from '../core/cv.schema.ts';
import type { Issues } from '../core/issues.ts';
import type { Plan } from '../core/place.ts';

/** The program that sets the .docx: the two set text a little differently. */
export type Engine = 'google' | 'libreoffice';

/**
 * The bytes of the .docx, the same for the same input. PHOTO_UNREADABLE when the stored photo is
 * no picture: the photo belongs to the CV, so the issue stands at `['cv', 'person', 'photo']`.
 */
export declare function render(
  cv: Master,
  plan: Plan,
  photo: Uint8Array,
  engine: Engine,
): Promise<Uint8Array | Issues<'cv'>>;
