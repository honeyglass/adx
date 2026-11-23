/**
 * The answer every adx tool writes, as proto/adx/index.d.ts declares it in Answer.
 *
 * Step, Issue: one next step, and one issue of a refusal.
 * answerShape: the answer, with the schema of the result of one command.
 */
import { z } from 'zod';

export const Step = z.object({
  does: z.string(),
  command: z.string().optional(),
  needs: z.array(z.string()).optional(),
});

export const Issue = z.object({
  code: z.string(),
  path: z.string().optional(),
  message: z.string(),
  hint: z.string(),
  command: z.string().optional(),
});

export const answerShape = <R extends z.ZodType>(result: R) =>
  z.object({
    ok: z.boolean(),
    applied: z.boolean().optional(),
    kind: z.enum(['fix', 'retry', 'ask', 'bug']).optional(),
    state: z.string().optional(),
    result: result.optional(),
    next: z.array(Step).optional(),
    issues: z.array(Issue).optional(),
  });
