// The tool \`shop\` of remote.api.spec.ts: a remote with a token, and commands that read and send.
// Its tests run it as a program, outside the test kit, so it reaches a local server.
import { $try } from '@honeyglass/utils/ts';
import { z } from 'zod';
import {
  bearer,
  code,
  cwd,
  effect,
  envUrl,
  failed,
  hint,
  needs,
  read,
  remote,
  root,
  status,
  tool,
} from '@honeyglass/adx';

export const api = remote('shop', {
  url: envUrl('SHOP_URL', 'https://shop.example.com/api'),
  auth: bearer('SHOP_TOKEN'),
});

export const Item = z.object({ id: z.string(), name: z.string() });

export const noItem = code('ITEM_NOT_FOUND', 'fix', 'Use an id the shop knows');
export const stillOpen = code('STILL_OPEN', 'fix', 'Wait until the item is free');

export const show = read({
  does: 'shows one item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  run: async ({ id }, { refuse }) => {
    const item = await api.get(['items', id], Item, { on: { 404: undefined } });
    return item ?? refuse(noItem.at('id', `the shop has no item ${id}`));
  },
});

export const search = read({
  does: 'finds items',
  input: z.object({ q: z.string() }),
  example: { q: 'pen' },
  run: ({ q }) => api.get(['items'], z.array(Item), { query: { q, limit: 5, cursor: undefined } }),
});

export const create = effect({
  does: 'adds an item',
  input: z.object({ name: z.string() }),
  example: { name: 'pen' },
  replace: false,
  plan: ({ name }) => ({ name }),
  apply: async ({ name }, { act }) => ({
    item: await act.send('the new item', api.post(['items'], { name }), Item),
  }),
  look: ({ name }) => search.step({ q: name }),
});

export const close = effect({
  does: 'closes an item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  replace: false,
  plan: ({ id }) => ({ id }),
  apply: async ({ id }, { act, refuse }) => {
    await act.send('the note', api.post(['items', id, 'notes'], { text: 'closing' }), z.unknown());
    const request = api.patch(['items', id], { state: 'closed' });
    const sent = await $try(act.send('the closed item', request, Item));
    if (sent.error === null) return { item: sent.data };
    if (status(sent.error) === 409) return refuse(stillOpen.issue(`${id} is still open`));
    throw sent.error;
  },
  look: ({ id }) => show.step({ id }),
});

export const pick = read({
  does: 'picks an item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  values: {
    id: async () => (await api.get(['ids'], z.array(z.string()))).map(value => ({ value })),
  },
  run: ({ id }) => ({ id }),
});

export const move = read({
  does: 'moves an item to a slot',
  input: z.object({ shelf: z.string().optional(), slot: z.string() }),
  example: { shelf: 'top', slot: 's1' },
  values: {
    shelf: async () => (await api.get(['shelves'], z.array(z.string()))).map(value => ({ value })),
    slot: ({ shelf }) => (shelf === undefined ? needs('shelf') : [{ value: 's1' }]),
  },
  run: ({ slot }) => ({ slot }),
});

export const work = root('work', cwd);

export const stock = effect({
  does: 'stocks an item and tells the shop',
  input: z.object({ name: z.string() }),
  example: { name: 'pen' },
  plan: ({ name }, { files }) => files.write(work.file(`${name}.json`), '{}'),
  apply: async ({ name }, { act }) => ({
    item: await act.send('the stock', api.post(['items'], { name }), Item),
  }),
  look: ({ name }) => search.step({ q: name }),
});

export const migrate = effect({
  does: 'migrates the shop',
  replace: false,
  plan: () => ({}),
  apply: async (_, { act }) => {
    await act.send('the note', api.post(['notes'], { text: 'migrating' }), z.unknown());
    throw failed('The migration ran up to step 3.', new Error('step 4 broke'));
  },
  look: () => search.step({ q: 'migration' }),
});

export const reserve = effect({
  does: 'reserves an item',
  input: z.object({ id: z.string() }),
  example: { id: 'a1' },
  replace: false,
  plan: ({ id }) => ({ id }),
  apply: (_, { refuse }) => refuse(noItem.at('id')),
  look: ({ id }) => show.step({ id }),
});

export const weigh = effect({
  does: 'weighs an item',
  replace: false,
  plan: () => ({}),
  apply: async (_, { act }) => {
    const sent = await $try(act.send('the weight', api.post(['weights'], {}), z.unknown()));
    return { status: status(sent.error) ?? null };
  },
  look: () => search.step({ q: 'weight' }),
});

export const shop = tool({
  name: 'shop',
  version: '1.0.0',
  does: 'sells things',
  roots: [work],
  remotes: [api],
  commands: { show, search, create, close, pick, move, stock, migrate, reserve, weigh },
  hints: [hint(noItem, () => pick.step().carry('id'))],
});
