import assert from 'node:assert/strict';
import { test } from 'node:test';
import { z } from 'zod';
import { read, tool } from '@honeyglass/adx';
import { run } from '@honeyglass/adx/test';
import { answerIn } from '../utils/answer.ts';

const Language = z.object({
  code: z.string().describe('the language code'),
  name: z.string(),
  formal: z.string().optional(),
});

const GERMAN = { code: 'de', name: 'German', formal: 'Guten Tag' };

const language = read({
  does: 'shows one language in full',
  input: z.object({ code: z.string() }),
  example: { code: 'de' },
  output: Language,
  run: () => GERMAN,
});

const all = read({
  does: 'shows every language',
  output: z.array(Language),
  run: () => [GERMAN, { code: 'eo', name: 'Esperanto' }],
});

const plain = read({ does: 'answers without output', run: () => GERMAN });

const greeting = read({
  does: 'shows a greeting',
  output: z.object({ name: z.string(), tags: z.array(z.string()) }),
  run: () => ({ name: 'German', tags: ['formal', 'casual'] }),
  text: out => out.tags.join(','),
});

const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  commands: { language, all, plain, greeting },
});

const answerOf = async (...argv: string[]) => {
  const { exit, out } = await run(hello, argv);
  return { exit, ...answerIn(out, z.unknown()) };
};

test('without --fields a read with output answers everything', async () => {
  assert.deepEqual((await answerOf('language', '--code', 'de')).result, GERMAN);
});

test('--fields answers the named fields, each whole, of an object or of each item', async () => {
  assert.deepEqual((await answerOf('language', '--code', 'de', '--fields', 'code,formal')).result, {
    code: 'de',
    formal: 'Guten Tag',
  });
  assert.deepEqual((await answerOf('all', '--fields', 'name')).result, [
    { name: 'German' },
    { name: 'Esperanto' },
  ]);
});

test('--fields alone lists the fields of the answer', async () => {
  const { exit, result } = await answerOf('language', '--fields');
  assert.equal(exit, 0);
  assert.deepEqual(result, {
    option: 'fields',
    values: [{ value: 'code', does: 'the language code' }, { value: 'name' }, { value: 'formal' }],
  });
  const { out } = await run(hello, ['language', '--fields'], { tty: true });
  assert.equal(out, 'option  fields\nvalues  code, name, formal\n');
});

test('a field the answer does not have is refused with the call that lists them', async () => {
  const { exit, issues } = await answerOf('language', '--code', 'de', '--fields', 'code,nmae');
  assert.equal(exit, 1);
  assert.deepEqual(
    issues?.map(i => [i.code, i.path, i.command]),
    [['NOT_IN_LIST', 'fields', 'hello language --fields']],
  );
});

test('a read without output refuses --fields as an unknown option', async () => {
  const { issues } = await answerOf('plain', '--fields', 'code');
  assert.deepEqual(
    issues?.map(i => [i.code, i.path]),
    [['UNKNOWN_OPTION', 'fields']],
  );
});

test("at a terminal, a cut answer prints in adx's own form, not by the text of the whole", async () => {
  const whole = await run(hello, ['greeting'], { tty: true });
  assert.equal(whole.out, 'formal,casual\n');
  const cut = await run(hello, ['greeting', '--fields', 'name'], { tty: true });
  assert.deepEqual([cut.exit, cut.out], [0, 'name  German\n']);
});

test('--fields comes once, with a value or alone', async () => {
  for (const argv of [
    ['language', '--fields', 'code', '--fields'],
    ['language', '--fields', '--fields'],
  ]) {
    const { exit, issues } = await answerOf(...argv);
    assert.deepEqual(
      [argv, exit, issues?.map(i => [i.code, i.path])],
      [argv, 1, [['REPEATED_OPTION', 'fields']]],
    );
  }
});
