import type { SqlStorage, DurableObjectState } from '@cloudflare/workers-types';
import type { DatabaseSync } from 'node:sqlite';
import { AccountStoreCore } from '../src/lib/account-store-core';
import { BillingStore } from '../src/lib/billing-store';
import { SavedResultsStore } from '../src/lib/saved-results-store';

// Business operations run synchronously inside transactionSync, so a code use,
// checkout reservation or webhook update cannot interleave with another request.
class DurableSqliteAdapter {
  constructor(private sql: SqlStorage) {}
  exec(query: string) {
    for (const statement of query.split(';').map(part => part.trim()).filter(Boolean)) {
      if (/^(?:PRAGMA|BEGIN|COMMIT|ROLLBACK)\b/i.test(statement)) continue;
      this.sql.exec(statement).toArray();
    }
  }
  prepare(query: string) {
    const run = (...args: unknown[]) => this.sql.exec(query, ...args.map(value => value === undefined ? null : value) as (string | number | null | ArrayBuffer)[]);
    return {
      get: (...args: unknown[]) => run(...args).toArray()[0],
      all: (...args: unknown[]) => run(...args).toArray(),
      run: (...args: unknown[]) => { const cursor = run(...args); cursor.toArray(); return { changes: cursor.rowsWritten }; },
    };
  }
}
const allowed: Record<string, readonly string[]> = {
  accounts: ['account', 'limit', 'reserveCode', 'markDelivered', 'invalidateCode', 'register'],
  billing: ['subscription', 'entitlement', 'reserveCheckout', 'checkoutReady', 'checkoutFailed', 'enqueue', 'processInbox', 'markCanceling'],
  results: ['save', 'list', 'get', 'delete'],
};

export class AppDatabase {
  private database: DatabaseSync;
  private accounts: AccountStoreCore;
  constructor(private ctx: DurableObjectState) {
    this.database = new DurableSqliteAdapter(ctx.storage.sql) as unknown as DatabaseSync;
    this.accounts = new AccountStoreCore(this.database);
  }
  async fetch(request: Request) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/call') return new Response('Not found', { status: 404 });
    const { group, method, args, store, environment } = await request.json() as { group: string; method: string; args: unknown[]; store: string; environment: string };
    if (!allowed[group]?.includes(method) || !Array.isArray(args)) return new Response('Invalid operation', { status: 400 });
    try {
      const value = this.ctx.storage.transactionSync(() => {
        const target = group === 'accounts' ? this.accounts : group === 'billing' ? new BillingStore(this.database, store, environment) : new SavedResultsStore(this.database);
        const operation = (target as unknown as Record<string, (...values: unknown[]) => unknown>)[method];
        return operation.apply(target, args);
      });
      return Response.json({ value: value ?? null });
    } catch (error) {
      const known = error instanceof Error && ['already-subscribed', 'checkout-pending', 'wrong-billing-scope'].includes(error.message);
      const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
      return Response.json({ error: known || status ? (error as Error).message : 'Persistent storage request failed.', ...(status ? { status } : {}) }, { status: known || status ? 409 : 503 });
    }
  }
}
