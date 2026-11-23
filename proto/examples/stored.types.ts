// What must not compile in stored.ts. The typecheck reads this file, and nothing runs it.
import { stored } from '@honeyglass/adx';
import { Friend, FriendV1, FriendV2 } from './stored.ts';

// A step that does not answer the next format does not compile.
// @ts-expect-error langs is missing in what the step answers
stored('friend', 2, FriendV2).from(1, FriendV1, old => ({ name: old.name }));
// @ts-expect-error a stored kind writes its own type only
Friend.stringify({ name: 'ada', lang: 'de' });
// @ts-expect-error Friend.text was renamed Friend.stringify
Friend.text({ name: 'ada', langs: ['de'] });
