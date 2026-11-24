/**
 * What the test kit reads of a tool's answers, which come from outside: from stdout of a call.
 *
 * Answer, answerIn: one answer of adx, and the answer the last line of stdout holds.
 * Started, Overview, Facts: the results of the start answer, of `schema`, and of
 * `schema <command>`, as far as the probes read them.
 * fingerprintsIn: the fingerprints adx.stored.json holds, per kind and format number.
 * keysIn: the fields a --json value of a named command gives.
 *
 * This is the one file of test/ that calls Zod. A text that holds no answer of this shape is
 * no answer, and the probe that called says so.
 *
 * @example const answer = answerIn(called.out);
 */
import { trySync$ } from '@honeyglass/utils/ts';
import { z } from 'zod';

export const Answer = z.object({
  ok: z.boolean(),
  applied: z.boolean().optional(),
  kind: z.enum(['fix', 'retry', 'ask', 'bug']).optional(),
  state: z.string().optional(),
  result: z.unknown().optional(),
  next: z
    .array(
      z.object({
        does: z.string(),
        command: z.string().optional(),
        needs: z.array(z.string()).optional(),
      }),
    )
    .optional(),
  issues: z
    .array(
      z.object({
        code: z.string(),
        path: z.string().optional(),
        message: z.string(),
        hint: z.string(),
        command: z.string().optional(),
      }),
    )
    .optional(),
});

export type Answer = z.output<typeof Answer>;

export const Started = z.object({ name: z.string() });

export const Overview = z.object({
  commands: z.array(z.object({ command: z.string() })),
  shapes: z.array(z.string()),
  roots: z.array(z.object({ root: z.string(), variable: z.string().optional() })),
});

export const Facts = z.object({
  fields: z.array(
    z.object({
      field: z.string(),
      option: z.string().optional(),
      takes: z.string(),
      required: z.boolean().optional(),
      repeats: z.boolean().optional(),
    }),
  ),
  options: z.array(z.object({ option: z.string() })),
  lists: z.array(z.string()),
  example: z.unknown().optional(),
  output: z.unknown().optional(),
});

export type Facts = z.output<typeof Facts>;

/**
 * @param out - what a call wrote to stdout
 * @returns the answer of its last line, and what stands before that line
 */
export function answerIn(out: string) {
  const lines = out.endsWith('\n') ? out.slice(0, -1) : out;
  const cut = lines.lastIndexOf('\n');
  const beside = cut === -1 ? '' : out.slice(0, cut + 1);
  const json = trySync$((): unknown => JSON.parse(lines.slice(cut + 1)));
  const answer = json.error === null ? Answer.safeParse(json.data) : undefined;
  return { answer: answer?.success === true ? answer.data : undefined, beside };
}

/** @returns the result parsed by the schema, or undefined for one of another shape */
export const resultOf = <S extends z.ZodType>(answer: Answer | undefined, shape: S) => {
  const parsed = shape.safeParse(answer?.result);
  return parsed.success ? parsed.data : undefined;
};

const Fingerprints = z.record(z.string(), z.record(z.string(), z.string()));

/**
 * A file that holds no table of fingerprints counts as none, and the kit writes it anew.
 *
 * @param text - the text of adx.stored.json, or undefined when there is none
 * @returns the fingerprint of each format number, per kind
 */
export function fingerprintsIn(text: string | undefined) {
  const json = trySync$((): unknown => JSON.parse(text ?? '{}'));
  const parsed = Fingerprints.safeParse(json.data);
  return parsed.success ? parsed.data : {};
}

const Given = z.record(z.string(), z.unknown());

/** @returns the keys of the object a --json value holds, none for any other text */
export function keysIn(text: string | undefined) {
  const json = trySync$((): unknown => JSON.parse(text ?? ''));
  const parsed = Given.safeParse(json.data);
  return parsed.success ? Object.keys(parsed.data) : [];
}
