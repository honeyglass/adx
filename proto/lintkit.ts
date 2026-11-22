// Guide, "A checker over a codebase".
import { z } from 'zod';
import {
  code,
  detailOf,
  dir,
  id,
  list,
  marker,
  multiline,
  paged,
  read,
  root,
  tell,
  tool,
} from '@honeyglass/adx';
import type { Dir } from '@honeyglass/adx';
import { check, RULES } from './rules.ts';

const gomod = root('module', marker('go.mod'));

const Finding = z.object({
  id: id().describe('a stable id for the same rule, file and line'),
  rule: z.string().describe('the rule that fired'),
  file: z.string().describe('the file, relative to the module'),
  line: z.number().describe('the line'),
  message: z.string().describe('what is wrong and how to fix it'),
  source: multiline().describe('the lines around the finding'),
});

const SOURCE_BYTES = 1_048_576; // no Go file of ours is larger than 1 MiB

async function findAll(folder: Dir, only: readonly string[]) {
  const all: z.output<typeof Finding>[] = [];
  for await (const file of folder.walk('.go')) {
    const source = await file.text(SOURCE_BYTES);
    all.push(...check(file.rel, source, only));
  }
  return all;
}

const noRule = code('NO_RULE', 'fix', 'Name a rule, or leave --strict out');
const noFinding = code('FINDING_NOT_FOUND', 'fix', 'Run the check again and use an id it lists');

const findings = list({
  does: 'checks the Go files of a folder',
  input: z.object({
    dir: dir(gomod).describe('the folder to check'),
    rule: z.array(z.enum(RULES)).default([]).describe('a rule; may repeat'),
    strict: z.boolean().default(false).describe('refuse a check of all rules'),
  }),
  example: { dir: '.' },
  item: Finding,
  key: 'id',
  outline: ['rule', 'file', 'line'],
  check: ({ rule, strict }) => (strict && rule.length === 0 ? [noRule.at('rule')] : []),
  run: async ({ dir, rule }, { page }) => paged(await findAll(dir, rule), page),
  next: out => (out.items.length > 0 ? [tell('fix the findings, then check again')] : []),
});

const finding = read({
  does: 'shows one finding in full',
  input: z.object({
    dir: dir(gomod).describe('the folder that was checked'),
    id: id().describe('an id the check answered'),
  }),
  example: { dir: '.', id: 'f-7c2e91' },
  values: { id: detailOf(findings) },
  run: async ({ dir, id }, { refuse }) => {
    const all = await findAll(dir, []);
    return all.find(f => f.id === id) ?? refuse(noFinding.at('id'));
  },
});

export const lintkit = tool({
  name: 'lintkit',
  version: '0.4.0',
  does: 'checks Go files against house rules',
  roots: [gomod],
  commands: { check: findings, finding },
});

// A typo in a list's check does not compile.
list({
  does: 'x',
  input: z.object({ dir: dir(gomod), rule: z.array(z.enum(RULES)).default([]) }),
  example: { dir: '.' },
  item: Finding,
  key: 'id',
  outline: ['rule'],
  // @ts-expect-error rul is no field of the input
  check: ({ rule }) => (rule.length === 0 ? [noRule.at('rul')] : []),
  run: async ({ dir, rule }, { page }) => paged(await findAll(dir, rule), page),
});

if (import.meta.main) await lintkit.main();
