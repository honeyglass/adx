/**
 * The value one call keeps across its awaits, as Node's AsyncLocalStorage holds it.
 *
 * scope: the one store of the process, which every call runs in with its own value.
 *
 * @example await scope.run(roots, () => handler(input));
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Scope } from '../core/index.ts';

const storage = new AsyncLocalStorage<object>();

export const scope: Scope = {
  run: (value, work) => storage.run(value, work),
  get: () => storage.getStore(),
};
