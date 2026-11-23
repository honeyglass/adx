// What must not compile in hello2.ts. The typecheck reads this file, and nothing runs it.
import { z } from 'zod';
import { detailOf, effect, envDir, id, list, paged, read, root, tool } from '@honeyglass/adx';
import {
  blankName,
  friendFile,
  greet,
  Language,
  LANGUAGES,
  languageChoices,
  languages,
  noFormal,
  noFriends,
} from './hello2.ts';

// ---- what must NOT compile ----
read({
  does: 'x',
  input: z.object({ name: z.string(), lang: z.string() }),
  example: { name: 'Ada', lang: 'de' },
  // @ts-expect-error typo in a values key
  values: { lnag: languageChoices },
  run: ({ name }) => ({ greeting: name }),
});
read({
  does: 'x',
  input: z.object({ name: z.string(), style: z.string() }),
  example: { name: 'Ada', style: 'x' },
  run: ({ name }, { refuse }) => {
    // @ts-expect-error refusal at a field that does not exist, reported on this line
    if (name === '') return refuse(noFormal.at('styl'));
    return { greeting: name };
  },
});
list({
  does: 'x',
  item: Language,
  // @ts-expect-error key is no field of the item
  key: 'kode',
  outline: ['name'],
  run: (_, { page }) => paged(LANGUAGES, page),
});
list({
  does: 'x',
  item: Language,
  key: 'code',
  // @ts-expect-error outline typo
  outline: ['nmae'],
  run: (_, { page }) => paged(LANGUAGES, page),
});
read({
  does: 'x',
  input: z.object({ code: id() }),
  example: { code: 'de' },
  // @ts-expect-error detailOf at a field the input does not have
  values: { kode: detailOf(languages) },
  run: ({ code }) => ({ code }),
});
effect({
  does: 'x',
  input: z.object({ name: id(), lang: z.string() }),
  example: { name: 'ada', lang: 'de' },
  plan: friend => friend,
  // @ts-expect-error needs names a field greet does not have
  next: friend => [greet.step({ lang: friend.lang }).needs('nmae')],
});
read({
  does: 'x',
  input: z.object({ name: z.string() }),
  example: { name: 'Ada' },
  // @ts-expect-error a check issue at a field that does not exist
  check: ({ name }) => (name === '' ? [blankName.at('nmae')] : []),
  run: ({ name }) => ({ greeting: name }),
});
read({
  does: 'x',
  input: z.object({ name: z.string() }),
  // @ts-expect-error example misses the required name
  example: {},
  run: ({ name }) => ({ greeting: name }),
});
// @ts-expect-error invoke with a misspelled field
void greet.invoke({ nmae: 'Ada' });

// the old names and shapes are gone
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error files.put was renamed files.write
  plan: ({ name }, { files }) => files.put(friendFile(name), name),
});
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error replace takes false or 'always'; without it the command takes --replace
  replace: true,
  plan: ({ name }) => ({ name }),
});
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error files.update takes the limit and a function, not the new content
  plan: ({ name }, { files }) => files.update(friendFile(name), name),
});
tool({
  name: 'bad12',
  version: '0.1.0',
  does: 'x',
  // @ts-expect-error the skill is a path, not a URL
  skill: new URL('./SKILL.md', import.meta.url),
  commands: {},
});
// @ts-expect-error the option of a root cannot be switched off
root('bad13', envDir('HELLO_HOME'), { option: false });
effect({
  does: 'x',
  input: z.object({ name: id() }),
  example: { name: 'ada' },
  // @ts-expect-error files.update takes no mode: a changed file keeps its mode
  plan: ({ name }, { files }) => files.update(friendFile(name), 100, () => name, { mode: 0o644 }),
});
read({
  does: 'x',
  // @ts-expect-error a command without input has no field to refuse at; use .issue()
  run: (_, { refuse }) => refuse(noFriends.at('friends')),
});
// @ts-expect-error .at() always names a field
noFriends.at();

// A field named like an option adx gives the command does not compile.
list({
  does: 'x',
  // @ts-expect-error a list has --page from adx
  input: z.object({ page: z.number() }),
  example: { page: 2 },
  item: Language,
  key: 'code',
  outline: ['name'],
  run: (_, { page }) => paged(LANGUAGES, page),
});
read({
  does: 'x',
  // @ts-expect-error a read with output has --fields from adx
  input: z.object({ fields: z.string() }),
  example: { fields: 'name' },
  output: Language,
  run: () => ({ code: 'de', name: 'German', hello: 'Hallo' }),
});
read({
  does: 'x',
  // @ts-expect-error every command has --help from adx
  input: z.object({ help: z.string() }),
  example: { help: 'x' },
  run: ({ help }) => ({ help }),
});
// An effect has no --page, and no command has --version: both names are free there.
effect({
  does: 'x',
  input: z.object({ name: id(), page: z.number(), version: z.string() }),
  example: { name: 'ada', page: 2, version: '3' },
  replace: false,
  plan: ({ name, page, version }) => ({ name, page, version }),
});
// A read without output has no --fields.
read({
  does: 'x',
  input: z.object({ fields: z.string() }),
  example: { fields: 'name' },
  run: ({ fields }) => ({ fields }),
});

// @ts-expect-error oneOf was renamed detailOf
import { oneOf } from '@honeyglass/adx';
// @ts-expect-error listedBy was renamed keyOf
import { listedBy } from '@honeyglass/adx';
