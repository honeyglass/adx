// Guide, "Input that has parts": a part only the handler can check, and a step to schema.
import { z } from 'zod';
import { check, effect, envDir, fresh, id, root, schema, tool } from '@honeyglass/adx';

const home = root('home', envDir('HELLO_HOME'));

const LIMIT = 65_536; // no friend file of ours is larger than 64 KiB

const friendFile = (name: string) => home.file(`friends/${name}.json`);

const friendNames = async () => (await home.list('friends', '.json')).map(f => f.stem);

const friendChoices = async () => (await friendNames()).map(name => ({ value: name }));

// What a caller says about a friend, by the kind of friend. No command takes one whole.
const Colleague = z.object({ team: z.string().describe('the team you share') });
const Relative = z.object({ relation: z.string().describe('such as aunt or cousin') });
const ABOUT = { colleague: Colleague, relative: Relative };

const Friend = z.object({
  name: id().describe("the friend's short name"),
  kind: z.enum(['colleague', 'relative']).describe('how you know the friend'),
});

const describe = effect({
  does: 'says more about a friend',
  input: z.object({
    name: id().describe("the friend's short name"),
    about: z.unknown().describe('a colleague or a relative, as the kind of the friend says'),
  }),
  example: { name: 'ada', about: { team: 'billing' } },
  values: { name: friendChoices },
  replace: false,
  plan: async ({ name, about }, { files, refuse }) => {
    const friend = await friendFile(name).json(LIMIT, Friend);
    // The stored kind picks the shape, so the schema of the input cannot check this part.
    const said = check(ABOUT[friend.kind], about, ['about']);
    if (said.issues !== null) return refuse(...said.issues);
    const described = JSON.stringify({ ...friend, about: said.data });
    return files.update(friendFile(name), LIMIT, () => described);
  },
});

const add = effect({
  does: 'remembers a friend',
  input: Friend,
  example: { name: 'ada', kind: 'colleague' },
  values: { name: fresh(friendNames) },
  plan: (friend, { files }) => files.write(friendFile(friend.name), JSON.stringify(friend)),
  next: (_, { name, kind }) => [schema.step(kind), describe.step({ name })],
});

export const hello = tool({
  name: 'hello',
  version: '0.1.0',
  does: 'greets people',
  roots: [home],
  shapes: { colleague: Colleague, relative: Relative },
  commands: { friends: { add, describe } },
});

// ---- what must NOT compile ----
effect({
  does: 'x',
  input: z.object({ about: z.unknown() }),
  replace: false,
  plan: ({ about }, { refuse }) => {
    const said = check(Colleague, about, ['abuot']);
    // @ts-expect-error a path starts with a field of the input, and abuot is none
    if (said.issues !== null) return refuse(...said.issues);
    return said.data;
  },
});
effect({
  does: 'x',
  input: z.object({ about: z.unknown() }),
  replace: false,
  // @ts-expect-error the value is there only when no issue is
  plan: ({ about }) => ({ team: check(Colleague, about, ['about']).data.team }),
});
// @ts-expect-error a path names its field at least
check(Colleague, {}, []);
// @ts-expect-error as takes the shape itself, not its name
check(Colleague, {}, ['about'], { as: 'colleague' });
// @ts-expect-error a step to schema names the shape or the command to show
schema.step();

if (import.meta.main) await hello.main();
