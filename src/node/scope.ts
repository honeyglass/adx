/**
 * The values one call keeps across its awaits, as Node's AsyncLocalStorage holds them.
 *
 * scope: the one store of the process, which every call runs in with its own values.
 *
 * A run copies the values of the call it starts in and sets its own key, so a feature that
 * keeps its value beside another's, such as the remotes beside the roots, leaves that one be.
 *
 * @example await scope.run(Located, roots, () => handler(input));
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Scope } from '../core/index.ts';

const storage = new AsyncLocalStorage<ReadonlyMap<object, unknown>>();

export const scope: Scope = {
  run: (key, value, work) => storage.run(new Map(storage.getStore()).set(key, value), work),
  get: key => storage.getStore()?.get(key),
};
