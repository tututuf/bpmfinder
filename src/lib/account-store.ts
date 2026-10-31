import { DatabaseSync } from 'node:sqlite';
import { AccountStoreCore } from './account-store-core.ts';
export { CODE_LIFETIME_MS, CODE_COOLDOWN_MS, CODE_MAX_ATTEMPTS } from './account-store-core.ts';
export class AccountStore extends AccountStoreCore {
  constructor(path: string) { super(new DatabaseSync(path)); }
}
