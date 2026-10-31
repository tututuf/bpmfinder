import type { DatabaseSync } from 'node:sqlite';
import { randomUUID, timingSafeEqual } from 'node:crypto';

export const CODE_LIFETIME_MS = 10 * 60 * 1000;
export const CODE_COOLDOWN_MS = 60 * 1000;
export const CODE_MAX_ATTEMPTS = 5;
type Account = { id: string; email: string; name: string; password_hash: string };
type Challenge = { id: string; code_hash: string; expires_at: number; created_at: number; attempts: number; delivered: number };

export class AccountStoreCore {
  readonly db: DatabaseSync;
  constructor(database: DatabaseSync) {
    this.db = database;
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
        password_hash TEXT NOT NULL, verified_at INTEGER NOT NULL, created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS registration_codes (
        email TEXT PRIMARY KEY, id TEXT NOT NULL, code_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0, delivered INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS auth_limits (
        key TEXT PRIMARY KEY, count INTEGER NOT NULL, resets_at INTEGER NOT NULL
      );`);
  }
  close() { this.db.close(); }
  account(email: string) {
    return this.db.prepare('SELECT id,email,name,password_hash FROM accounts WHERE email=?').get(email) as Account | undefined;
  }
  limit(key: string, maximum: number, windowMs: number, now = Date.now()) {
    this.db.prepare('DELETE FROM auth_limits WHERE resets_at<=?').run(now);
    const row = this.db.prepare(`INSERT INTO auth_limits(key,count,resets_at) VALUES (?,1,?)
      ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count,resets_at`).get(key, now + windowMs) as { count: number; resets_at: number };
    return { allowed: row.count <= maximum, retryAfter: Math.max(1, Math.ceil((row.resets_at - now) / 1000)) };
  }
  reserveCode(email: string, hash: string, now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.db.prepare('DELETE FROM registration_codes WHERE expires_at<=? AND created_at<=?').run(now, now - CODE_COOLDOWN_MS);
      const old = this.db.prepare('SELECT created_at FROM registration_codes WHERE email=?').get(email) as { created_at: number } | undefined;
      if (old && now - old.created_at < CODE_COOLDOWN_MS) {
        this.db.exec('COMMIT');
        return { id: null, retryAfter: Math.ceil((CODE_COOLDOWN_MS - (now - old.created_at)) / 1000) };
      }
      const id = randomUUID();
      this.db.prepare(`INSERT INTO registration_codes(email,id,code_hash,created_at,expires_at) VALUES (?,?,?,?,?)
        ON CONFLICT(email) DO UPDATE SET id=excluded.id,code_hash=excluded.code_hash,created_at=excluded.created_at,
        expires_at=excluded.expires_at,attempts=0,delivered=0`).run(email, id, hash, now, now + CODE_LIFETIME_MS);
      this.db.exec('COMMIT');
      return { id, retryAfter: 60 };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  markDelivered(email: string, id: string) {
    this.db.prepare('UPDATE registration_codes SET delivered=1 WHERE email=? AND id=?').run(email, id);
  }
  invalidateCode(email: string, id: string) {
    this.db.prepare('UPDATE registration_codes SET delivered=0,code_hash=? WHERE email=? AND id=?').run('invalid', email, id);
  }
  register(email: string, codeHash: string, passwordHash: string, now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const challenge = this.db.prepare('SELECT * FROM registration_codes WHERE email=?').get(email) as Challenge | undefined;
      const eligible = challenge && challenge.delivered === 1 && challenge.expires_at > now && challenge.attempts < CODE_MAX_ATTEMPTS;
      const matches = eligible && challenge.code_hash.length === codeHash.length && timingSafeEqual(Buffer.from(challenge.code_hash), Buffer.from(codeHash));
      let success = false;
      if (eligible) {
        this.db.prepare('UPDATE registration_codes SET attempts=attempts+1 WHERE email=?').run(email);
        if (matches && !this.account(email)) {
          this.db.prepare('INSERT INTO accounts(id,email,name,password_hash,verified_at,created_at) VALUES (?,?,?,?,?,?)')
            .run(randomUUID(), email, email.split('@')[0].slice(0, 60), passwordHash, now, now);
          this.db.prepare('DELETE FROM registration_codes WHERE email=?').run(email);
          success = true;
        }
      }
      this.db.exec('COMMIT');
      return success;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
}
