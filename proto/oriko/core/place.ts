// The page plan of a CV: which block lands on which page, in which column.
import { z } from 'zod';
import type { Master } from './cv.schema.ts';
import type { Issues } from './issues.ts';

const Heading = z.object({ text: z.string(), before: z.number(), after: z.number() });
const Placed = z.object({
  id: z.string().describe('the id of the block'),
  height: z.number().describe('its height in pt'),
  heading: Heading.nullable().describe('the section heading above it, if it starts one'),
});
const Column = z.object({
  used: z.number().describe('the pt the blocks take'),
  free: z.number().describe('the pt left on the page'),
  blocks: z.array(Placed),
});
export const Plan = z.object({
  pages: z.array(z.object({ left: Column, right: Column })).describe('one entry per page'),
});
export type Plan = z.output<typeof Plan>;

/** ROLE_TOO_LONG, BLOCK_TOO_TALL and PAGE_OVERFLOW, each below `cv`, such as `cv.pages`. */
export declare function place(cv: Master): Plan | Issues<'cv'>;

const Layout = z.object({
  code: z.string(),
  path: z.string(),
  message: z.string(),
  hint: z.string(),
});
export type Fit = { fits: boolean; layout: z.output<typeof Layout>[] };

/**
 * Whether a CV fits its pages, answered and not refused: an edit may make a CV too long, and
 * the edit still stands. `layout` lists what `place` would refuse.
 */
export declare function fit(cv: Master): Fit;
