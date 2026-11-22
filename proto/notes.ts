// Guide, "Files the call names".
import { z } from 'zod';
import { effect, envDir, inFile, multiline, outFile, read, root, tool } from '@honeyglass/adx';

const home = root('home', envDir('NOTES_HOME', '~/notes'));

type Note = { title: string; text: string };
const render = (note: Note) => `# ${note.title}\n\n${note.text}\n`;

const LIMIT = 1_048_576; // no note of ours is larger than 1 MiB
/** Your own function: the index text with the line of this note added or changed. */
declare function indexWith(index: string, note: { title: string }): string;

// Two commands read this schema, so it has a name.
const NoteIn = z.object({
  file: outFile(home).describe('where the note goes, such as ideas/q3.md'),
  title: z.string().describe("the note's title"),
  text: multiline().describe('the note itself, Markdown'),
});
const sample = {
  file: 'ideas/q3.md',
  title: 'Q3 roadmap',
  text: '- ship saved carts',
};

// One function: the plan stages the file, adx writes it, a dry run does not.
const add = effect({
  does: 'stores one note',
  input: NoteIn,
  example: sample,
  plan: (note, { files }) => files.write(note.file, render(note)),
});

// A command whose purpose is to change a file: update, and no --replace.
const append = effect({
  does: 'adds text to the end of a note',
  input: z.object({
    file: inFile(home).describe('the note to add to'),
    text: multiline().describe('the text to add, Markdown'),
  }),
  example: { file: 'ideas/q3.md', text: '- ship gift cards' },
  replace: false,
  plan: ({ file, text }, { files }) => files.update(file, LIMIT, old => `${old}${text}\n`),
});

// Several files in one commit.
const addIndexed = effect({
  does: 'stores one note and updates the index',
  input: NoteIn,
  example: sample,
  plan: async (note, { files }) => {
    const index = home.file('index.md');
    return {
      note: files.write(note.file, render(note)),
      index: index.exists
        ? await files.update(index, LIMIT, old => indexWith(old, note))
        : files.write(index, indexWith('', note)),
    };
  },
  text: out => `${out.note.file} (${out.note.bytes} bytes)`,
});

// Reading a file the call names. A note can be long, so the answer has a schema.
const show = read({
  does: 'shows one note',
  input: z.object({ file: inFile(home).describe('the note to show') }),
  example: { file: 'ideas/q3.md' },
  output: z.object({
    file: z.string().describe('the note, relative to the folder'),
    text: multiline().describe('the note itself, Markdown'),
  }),
  run: async ({ file }) => ({ file: file.rel, text: await file.text(LIMIT) }),
});

export const notes = tool({
  name: 'notes',
  version: '0.2.0',
  does: 'keeps Markdown notes in a folder',
  roots: [home],
  commands: { add, 'add-indexed': addIndexed, append, show },
});

if (import.meta.main) await notes.main();
