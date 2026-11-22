import { z } from 'zod';
import { code } from '@honeyglass/adx';
import { api, read } from '../core/tracker.ts';

const inactive = code('USER_INACTIVE', 'ask', 'Ask an admin to activate the account');

export const whoami = read({
  does: 'names the signed-in user',
  global: false,
  run: async (_, { refuse }) => {
    const user = await api.get(['user'], z.object({ login: z.string(), active: z.boolean() }));
    return user.active ? user : refuse(inactive.issue(`${user.login} is deactivated`));
  },
});
