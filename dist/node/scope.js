/**
 * The value one call keeps across its awaits, as Node's AsyncLocalStorage holds it.
 *
 * scope: the one store of the process, which every call runs in with its own value.
 *
 * @example await scope.run(roots, () => handler(input));
 */
import { AsyncLocalStorage } from 'node:async_hooks';
const storage = new AsyncLocalStorage();
export const scope = {
    run: (value, work) => storage.run(value, work),
    get: () => storage.getStore(),
};
