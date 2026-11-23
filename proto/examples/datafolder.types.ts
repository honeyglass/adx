// What must not compile in datafolder.ts. The typecheck reads this file, and nothing runs it.
import { effect } from '@honeyglass/adx';
import { friendFile, FriendIn } from './datafolder.ts';

// ---- what must NOT compile ----
effect({
  does: 'x',
  input: FriendIn,
  example: { name: 'ada', lang: 'de' },
  replace: 'always',
  // @ts-expect-error a write has no replaces option: the command says it, for all of its writes
  plan: (friend, { files }) => files.write(friendFile(friend.name), 'x', { replaces: 'always' }),
});
effect({
  does: 'x',
  input: FriendIn,
  example: { name: 'ada', lang: 'de' },
  // @ts-expect-error replace takes false or 'always', and no other word
  replace: 'never',
  plan: (friend, { files }) => files.write(friendFile(friend.name), 'x'),
});
