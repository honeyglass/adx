import type { Master } from '../core/cv.schema.ts';
import type { Plan } from '../core/place.ts';

/** The pages as text, one line per row of the terminal, every line 84 characters wide. */
export declare function preview(cv: Master, plan: Plan): string;
