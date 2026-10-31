import 'server-only';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { AccountStoreCore } from './account-store-core';
import type { BillingStore } from './billing-store';
import type { SavedResultsStore } from './saved-results-store';
import { SavedResultError } from './saved-result-data';

type AsyncMethods<T> = { [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<Awaited<R>> : never };
type Stores = { accounts: AccountStoreCore; billing: BillingStore; results: SavedResultsStore };

export function storage<G extends keyof Stores>(group: G): AsyncMethods<Stores[G]> {
  return new Proxy({}, {
    get(_target, method: string) {
      return async (...args: unknown[]) => {
        const store = process.env.WAFFO_STORE_ID || '';
        const environment = process.env.WAFFO_ENVIRONMENT === 'test' ? 'test' : 'prod';
        if (process.env.STORAGE_BACKEND === 'cloudflare') {
          const { env } = getCloudflareContext();
          const namespace = (env as unknown as { APP_DATABASE: DurableObjectNamespace }).APP_DATABASE;
          if (!namespace) throw new Error('Persistent database binding is missing.');
          const response = await namespace.get(namespace.idFromName('bpmfinder-v1')).fetch('https://database.internal/call', {
            method: 'POST', body: JSON.stringify({ group, method, args, store, environment }),
          });
          const result = await response.json() as { value?: unknown; error?: string; status?: number };
          if (!response.ok) {
            if (group === 'results' && result.status) throw new SavedResultError(result.error || 'Saved results unavailable.', result.status);
            throw new Error(result.error || 'Persistent storage request failed.');
          }
          return result.value;
        }
        const { localStores } = await import('../../cloudflare/node-storage');
        const target = localStores(store, environment)[group];
        const operation = target[method as keyof typeof target] as unknown as (...values: unknown[]) => unknown;
        return operation.apply(target, args);
      };
    },
  }) as AsyncMethods<Stores[G]>;
}
