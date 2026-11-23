// proto/examples/effect.ts as a program, with the answers of "A command that changes something".
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { answerIn } from '../utils/answer.ts';
import { pending } from '../utils/pending.ts';
import { PROTO, program, scratch } from '../utils/program.ts';

const EFFECT = join(PROTO, 'examples', 'effect.ts');
const ADA = ['friends', 'add', '--name', 'ada', '--lang', 'de'];
const WRITTEN = { file: 'friends/ada.json', bytes: 26, replaces: false };

const hello = (home: string, ...argv: string[]) => program(EFFECT, argv, { home });

pending('P6', 'a dry run stages the friend, and the real run writes it', async t => {
  const home = await scratch(t);
  const dry = answerIn((await hello(home, ...ADA, '--dry-run')).out, z.unknown());
  assert.equal(dry.applied, false);
  assert.deepEqual(dry.result, WRITTEN);
  assert.equal(dry.next?.[0]?.command, 'hello friends add --name ada --lang de');
  assert.equal(existsSync(join(home, '.hello')), false);
  const real = await hello(home, ...ADA);
  assert.equal(real.exit, 0);
  assert.equal(answerIn(real.out, z.unknown()).applied, true);
  const file = join(home, '.hello', 'friends', 'ada.json');
  assert.equal(await readFile(file, 'utf8'), '{"name":"ada","lang":"de"}');
  const again = answerIn((await hello(home, ...ADA)).out, z.unknown());
  assert.deepEqual(again.result, { ...WRITTEN, unchanged: true });
});

pending('P6', 'other content under a taken name needs --replace', async t => {
  const home = await scratch(t);
  await hello(home, ...ADA);
  const en = ['friends', 'add', '--name', 'ada', '--lang', 'en'];
  const refused = await hello(home, ...en);
  const issue = answerIn(refused.out, z.unknown()).issues?.[0];
  assert.equal(refused.exit, 1);
  assert.equal(issue?.code, 'ALREADY_EXISTS');
  assert.equal(issue?.command, 'hello friends add --name ada --lang en --replace --dry-run');
  const Replaced = z.object({
    replaces: z.boolean(),
    changes: z.object({ changed: z.array(z.string()) }),
  });
  const shown = answerIn((await hello(home, ...en, '--replace', '--dry-run')).out, Replaced);
  assert.equal(shown.applied, false);
  assert.equal(shown.result?.replaces, true);
  assert.deepEqual(shown.result?.changes.changed, ['lang']);
  assert.equal(shown.next?.[0]?.command, 'hello friends add --name ada --lang en --replace');
});
