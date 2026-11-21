// Guide, "A command that changes something": the first friends add.
import { z } from 'zod';
import { envDir, fresh, id, root, tool } from '@honeyglass/adx';

const home = root('home', envDir('HELLO_HOME'));

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  roots: [home],
});

const friendFile = (name: string) => home.file(`friends/${name}.json`);

const friendNames = async () => (await home.list('friends', '.json')).map(f => f.stem);

const FriendIn = z.object({
  name: id().describe("the friend's short name"),
  lang: z.string().describe("the friend's language code"),
});

const add = hello.effect({
  name: 'friends add',
  does: 'remembers a friend',
  input: FriendIn,
  example: { name: 'ada', lang: 'de' },
  values: { name: fresh(friendNames) },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
});

export { add };
if (import.meta.main) await hello.main();
