// proto/examples/stored.ts as a program, with the answers of "Stored data that changes its format".
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { pending } from '../utils/pending.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const STORED = join(PROTO, 'examples', 'stored.ts');

const hello = (home: string, ...argv: string[]) => program(STORED, argv, { home });

pending('P9', 'reads a friend of the older format, and writes the new one', async t => {
  const home = await scratch(t);
  const friends = join(home, '.hello', 'friends');
  await mkdir(friends, { recursive: true });
  await writeFile(join(friends, 'ada.json'), '{"name":"ada","lang":"de"}');
  const shown = await hello(home, 'friends', 'show', '--name', 'ada');
  assert.deepEqual(answerIn(shown.out, z.unknown()).result, { name: 'ada', langs: ['de'] });
  const learned = await hello(home, 'friends', 'learn', '--name', 'ada', '--lang', 'eo');
  assert.equal(answerIn(learned.out, z.unknown()).applied, true);
  const stored: unknown = JSON.parse(await readFile(join(friends, 'ada.json'), 'utf8'));
  assert.deepEqual(stored, { version: 2, name: 'ada', langs: ['de', 'eo'] });
});
