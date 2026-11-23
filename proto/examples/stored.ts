// Guide, "Stored data that changes its format": a format number for one kind of stored data.
import { z } from 'zod';
import { effect, envDir, id, read, root, stored, tool } from '@honeyglass/adx';

const home = root('home', envDir('HELLO_HOME'));

const FriendV1 = z.object({ name: id(), lang: z.string() });
const FriendV2 = z.object({ name: id(), langs: z.array(z.string()) });

const Friend = stored('friend', 2, FriendV2).from(1, FriendV1, old => ({
  name: old.name,
  langs: [old.lang],
}));

const LIMIT = 65_536; // no friend file of ours is larger than 64 KiB
const friendFile = (name: string) => home.file(`friends/${name}.json`);
const friendChoices = async () =>
  (await home.list('friends', '.json')).map(f => ({ value: f.stem }));

const show = read({
  does: 'shows one friend',
  input: z.object({ name: id().describe("the friend's short name") }),
  example: { name: 'ada' },
  values: { name: friendChoices },
  run: ({ name }) => friendFile(name).json(LIMIT, Friend),
  text: friend => `${friend.name}: ${friend.langs.join(', ')}`,
});

const learn = effect({
  does: 'adds a language to a friend',
  input: z.object({
    name: id().describe("the friend's short name"),
    lang: z.string().describe('the language code to add'),
  }),
  example: { name: 'ada', lang: 'eo' },
  values: { name: friendChoices },
  replace: false,
  plan: ({ name, lang }, { files }) =>
    files.update(friendFile(name), LIMIT, old => {
      const friend = Friend.parse(old);
      return Friend.stringify({ ...friend, langs: [...friend.langs, lang] });
    }),
});

export const hello = tool({
  name: 'hello',
  version: '0.3.0',
  does: 'greets people',
  roots: [home],
  stored: [Friend],
  commands: {
    friends: { show, learn },
  },
});

// Three formats: name them from the newest down, each step answers the format after it.
const FriendV3 = z.object({ name: id(), langs: z.array(z.string()), nick: z.string() });
const Friend3 = stored('friend', 3, FriendV3)
  .from(2, FriendV2, old => ({ ...old, nick: old.name }))
  .from(1, FriendV1, old => ({ name: old.name, langs: [old.lang] }));

export { Friend3 };
export { Friend, FriendV1, FriendV2 }; // for stored.types.ts
if (import.meta.main) await hello.main();
