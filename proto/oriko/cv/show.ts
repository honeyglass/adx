import { z } from 'zod';
import { read } from '@honeyglass/adx';
import type { Step } from '@honeyglass/adx';
import { COLUMN, KINDS } from '../core/cv.limits.ts';
import { Block, Id, Master, Page, Text } from '../core/cv.schema.ts';
import { FILE_LIMITS } from '../core/files.limits.ts';
import { unknownBlock } from '../core/issues.ts';
import { cvOfProfile } from '../core/load.ts';
import { cv, profile } from '../core/options.ts';
import { blockChoices, cvChoices, profileChoices } from '../core/sources.ts';

// What a caller needs to pick a block: never its whole text.
const Outline = z.object({
  id: Id,
  kind: z.enum(KINDS),
  column: z.enum(['left', 'right']),
  section: Text,
  title: Text.optional(),
  page: Page.optional(),
  hidden: z.boolean().optional(),
  items: z.number().describe('how many bullets or items the block holds'),
});

const outline = (block: Block) => ({
  id: block.id,
  kind: block.kind,
  column: COLUMN[block.kind],
  section: block.section,
  title: block.title,
  page: block.page,
  hidden: block.hidden,
  items: block.kind === 'job' ? block.bullets.length : block.items.length,
});

export const show = read({
  does: 'outlines a CV, or shows one block in full',
  input: z.object({
    cv,
    profile,
    block: Id.optional().describe('the id of one block to show in full'),
  }),
  values: { cv: cvChoices, profile: profileChoices, block: blockChoices },
  // One command with two answers, as in oriko today: the outline, or the one block.
  output: z.object({
    cv: Id.optional().describe('the name of the CV'),
    pages: Page.optional().describe('the pages the CV may fill'),
    blocks: z.array(Outline).optional().describe('the outline, without --block'),
    block: Block.optional().describe('the one block, with --block'),
  }),
  run: async ({ cv, profile, block }, { refuse }) => {
    const chosen = await cvOfProfile(cv, profile);
    if (Array.isArray(chosen)) return refuse(...chosen);
    const master = await chosen.file.json(FILE_LIMITS.inputBytes, Master);
    if (block === undefined)
      return { cv: chosen.name, pages: master.pages, blocks: master.blocks.map(outline) };
    const found = master.blocks.find(candidate => candidate.id === block);
    return found === undefined
      ? refuse(unknownBlock.at('block', `No block has the id ${block}`))
      : { block: found };
  },
  // The step names this command itself, so the function says its type (guide, "Known limits").
  next: (out, { cv, profile }): Step[] =>
    out.block === undefined ? [show.step({ cv, profile }).needs('block')] : [],
});
