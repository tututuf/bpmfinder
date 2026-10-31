import { createRequire } from 'node:module';
import { chmodSync, closeSync, mkdirSync, openSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { DatabaseSync } from 'node:sqlite';
import { AccountStoreCore } from '../src/lib/account-store-core';
import { BillingStore } from '../src/lib/billing-store';
import { SavedResultsStore } from '../src/lib/saved-results-store';

const shared = globalThis as typeof globalThis & { bpmLocalDatabase?: DatabaseSync; bpmLocalAccounts?: AccountStoreCore };
export function localStores(store: string, environment: string) {
  if (!shared.bpmLocalDatabase) {
    const nativeRequire = createRequire(import.meta.url);
    const sqlite = nativeRequire('node:sqlite') as typeof import('node:sqlite');
    const path = resolve(/* turbopackIgnore: true */ process.env.AUTH_DATABASE_PATH || '.data/accounts.sqlite');
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    closeSync(openSync(path, 'a', 0o600));
    chmodSync(path, 0o600);
    shared.bpmLocalDatabase = new sqlite.DatabaseSync(path);
    shared.bpmLocalAccounts = new AccountStoreCore(shared.bpmLocalDatabase);
  }
  return { accounts: shared.bpmLocalAccounts!, billing: new BillingStore(shared.bpmLocalDatabase, store, environment), results: new SavedResultsStore(shared.bpmLocalDatabase) };
}
