// Guide, chapter "The data folder" and "Files" in the reference: update, changes, modes.
import { z } from 'zod';
import { effect, envDir, fresh, id, outFile, read, root, tool } from '@honeyglass/adx';

const home = root('home', envDir('HELLO_HOME'));

const LIMIT = 65_536; // no friend file of ours is larger than 64 KiB

const friendFile = (name: string) => home.file(`friends/${name}.json`);

const friendNames = async () => (await home.list('friends', '.json')).map(f => f.stem);

const friendChoices = async () => (await friendNames()).map(name => ({ value: name }));

// Four commands read this schema, so it has a name.
const FriendIn = z.object({
  name: id().describe("the friend's short name"),
  lang: z.string().describe("the friend's language code"),
});

// Creates something new: files.write, and --replace for a taken name.
const add = effect({
  does: 'remembers a friend',
  input: FriendIn,
  example: { name: 'ada', lang: 'de' },
  values: { name: fresh(friendNames) },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
});

// Exists to change: files.update, and no --replace.
const edit = effect({
  does: "changes a friend's language",
  input: FriendIn,
  example: { name: 'ada', lang: 'en' },
  values: { name: friendChoices },
  replace: false,
  plan: ({ name, lang }, { files }) =>
    files.update(friendFile(name), LIMIT, old => JSON.stringify({ ...JSON.parse(old), lang })),
});

// Reading a file of the tool's own.
const show = read({
  does: 'shows one friend',
  input: z.object({ name: id().describe("the friend's short name") }),
  example: { name: 'ada' },
  values: { name: friendChoices },
  run: ({ name }) => friendFile(name).json(LIMIT, FriendIn),
});

// A plan that returns its own changes, in the tool's words.
const change = effect({
  does: "changes a friend's language and says so",
  input: FriendIn,
  example: { name: 'ada', lang: 'en' },
  values: { name: friendChoices },
  replace: false,
  plan: async ({ name, lang }, { files }) => {
    const next = (old: string) => JSON.stringify({ ...JSON.parse(old), lang });
    const written = await files.update(friendFile(name), LIMIT, next);
    const changes = { added: [], changed: ['language'], removed: [], more: 0 };
    return { ...written, changes };
  },
});

// A file for others to read: its own mode. And a derived file: every export builds it again from
// the friends, so the command says replace: 'always', and its write replaces without --replace.
const exportNames = effect({
  does: 'writes the names of all friends for others to read',
  input: z.object({ file: outFile(home).describe('where the list goes') }),
  example: { file: 'public/friends.txt' },
  replace: 'always',
  plan: async ({ file }, { files }) => {
    const names = (await friendNames()).join('\n');
    return files.write(file, names, { mode: 0o644 });
  },
});

export const hello = tool({
  name: 'hello',
  version: '0.2.0',
  does: 'greets people',
  roots: [home],
  commands: {
    friends: { add, edit, show, switch: change, export: exportNames },
  },
});

export { friendFile, FriendIn }; // for datafolder.types.ts
if (import.meta.main) await hello.main();
