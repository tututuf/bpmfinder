import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { BillingPlan } from './billing-plans';

type Checkout = { id: string; identity: string; plan: BillingPlan; store_id: string; environment: string; state: string; created_at: number; expires_at: number };
export type Subscription = { order_id: string; identity: string; plan: BillingPlan; state: string; expires_at: number; event_time: number; event_priority: number; payment_id: string | null };
export type BillingEvent = { id: string; timestamp: string; eventType: string; storeId: string; mode: string; data: {
  orderId: string; merchantProvidedBuyerIdentity?: string; orderMerchantExternalId?: string;
  orderMetadata?: Record<string, string>; orderStatus?: string; billingPeriod?: string;
  currentPeriodEnd?: string; paymentId?: string; refundedAmount?: string; originalChargedAmount?: string;
} };
const ACTIVE = new Set(['active', 'canceling']);
const STATE_EVENTS: Record<string, [string, number]> = {
  'subscription.activated': ['active', 1], 'subscription.renewed': ['active', 1],
  'subscription.recovered': ['active', 1], 'subscription.uncanceled': ['active', 1],
  'subscription.plan_changed': ['active', 1], 'subscription.canceling': ['canceling', 2],
  'subscription.past_due': ['past_due', 3], 'subscription.canceled': ['canceled', 4],
};

export class BillingStore {
  readonly db: DatabaseSync;
  readonly storeId: string;
  readonly environment: string;
  constructor(db: DatabaseSync, storeId: string, environment: string) {
    this.db = db;
    this.storeId = storeId;
    this.environment = environment;
    db.exec(`CREATE TABLE IF NOT EXISTS billing_checkouts (
      id TEXT PRIMARY KEY,identity TEXT NOT NULL,plan TEXT NOT NULL,store_id TEXT NOT NULL,environment TEXT NOT NULL,
      state TEXT NOT NULL,created_at INTEGER NOT NULL,expires_at INTEGER NOT NULL,provider_session TEXT);
      CREATE INDEX IF NOT EXISTS billing_checkout_identity ON billing_checkouts(identity);
      CREATE TABLE IF NOT EXISTS billing_subscriptions (
      order_id TEXT PRIMARY KEY,identity TEXT NOT NULL,plan TEXT NOT NULL,state TEXT NOT NULL,expires_at INTEGER NOT NULL,
      event_time INTEGER NOT NULL,event_priority INTEGER NOT NULL,payment_id TEXT,store_id TEXT NOT NULL,environment TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS billing_subscription_identity ON billing_subscriptions(identity);
      CREATE TABLE IF NOT EXISTS billing_inbox (
      id TEXT PRIMARY KEY,event_json TEXT NOT NULL,received_at INTEGER NOT NULL,processed_at INTEGER,attempts INTEGER NOT NULL DEFAULT 0);
      CREATE INDEX IF NOT EXISTS billing_inbox_pending ON billing_inbox(processed_at);`);
    // Fail closed for any pre-scope rows: only verified events may populate scope.
    const columns = db.prepare('PRAGMA table_info(billing_subscriptions)').all() as { name: string }[];
    for (const name of ['store_id', 'environment']) if (!columns.some(c => c.name === name)) db.exec(`ALTER TABLE billing_subscriptions ADD COLUMN ${name} TEXT NOT NULL DEFAULT ''`);
  }
  subscription(identity: string, now = Date.now()) {
    return this.db.prepare(`SELECT * FROM billing_subscriptions WHERE identity=? AND store_id=? AND environment=?
      ORDER BY CASE WHEN state IN ('active','canceling') AND expires_at>? THEN 0 ELSE 1 END,expires_at DESC LIMIT 1`).get(identity, this.storeId, this.environment, now) as Subscription | undefined;
  }
  entitlement(identity: string | undefined, now = Date.now()) {
    const row = identity ? this.subscription(identity, now) : undefined;
    return { hasPro: !!row && ACTIVE.has(row.state) && row.expires_at > now, plan: row?.plan ?? null, state: row?.state ?? 'free', expiresAt: row?.expires_at ?? null };
  }
  reserveCheckout(identity: string, plan: BillingPlan, store: string, environment: string, now = Date.now()) {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (store !== this.storeId || environment !== this.environment) throw new Error('wrong-billing-scope');
      const renewable = this.db.prepare("SELECT order_id FROM billing_subscriptions WHERE identity=? AND store_id=? AND environment=? AND state IN ('active','canceling','past_due') LIMIT 1").get(identity, store, environment);
      if (renewable) throw new Error('already-subscribed');
      const recent = this.db.prepare(`SELECT id FROM billing_checkouts WHERE identity=? AND store_id=? AND environment=? AND state IN ('creating','pending') AND expires_at>?`).get(identity, store, environment, now);
      if (recent) throw new Error('checkout-pending');
      const id = `bpm_${randomUUID()}`;
      this.db.prepare('INSERT INTO billing_checkouts(id,identity,plan,store_id,environment,state,created_at,expires_at) VALUES (?,?,?,?,?,?,?,?)')
        .run(id, identity, plan, store, environment, 'creating', now, now + 10 * 60 * 1000);
      this.db.exec('COMMIT'); return id;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  checkoutReady(id: string, session: string, expires: number) {
    this.db.prepare("UPDATE billing_checkouts SET state=CASE WHEN state='completed' THEN state ELSE 'pending' END,provider_session=?,expires_at=? WHERE id=?").run(session, expires, id);
  }
  checkoutFailed(id: string) { this.db.prepare("UPDATE billing_checkouts SET state='failed' WHERE id=? AND state='creating'").run(id); }
  enqueue(event: BillingEvent, now = Date.now()) {
    return this.db.prepare('INSERT OR IGNORE INTO billing_inbox(id,event_json,received_at) VALUES (?,?,?)').run(event.id, JSON.stringify(event), now).changes > 0;
  }
  processInbox(expectedStore: string, environment: string, now = Date.now()) {
    const rows = this.db.prepare('SELECT id,event_json FROM billing_inbox WHERE processed_at IS NULL ORDER BY received_at,id LIMIT 100').all() as { id: string; event_json: string }[];
    for (const row of rows) {
      this.db.exec('BEGIN IMMEDIATE');
      try {
        const pending = this.db.prepare('SELECT processed_at FROM billing_inbox WHERE id=?').get(row.id) as { processed_at: number | null };
        if (pending.processed_at === null) {
          this.apply(JSON.parse(row.event_json), expectedStore, environment);
          this.db.prepare('UPDATE billing_inbox SET processed_at=?,attempts=attempts+1 WHERE id=?').run(now, row.id);
        }
        this.db.exec('COMMIT');
      } catch (error) {
        this.db.exec('ROLLBACK');
        this.db.prepare('UPDATE billing_inbox SET attempts=attempts+1 WHERE id=?').run(row.id);
        throw error;
      }
    }
  }
  private apply(event: BillingEvent, expectedStore: string, environment: string) {
    if (event.storeId !== expectedStore || event.mode !== environment) return;
    const data = event.data;
    if (!data || typeof data.orderId !== 'string') return;
    const timestamp = Date.parse(event.timestamp);
    if (!Number.isFinite(timestamp)) return;
    const existing = this.db.prepare('SELECT * FROM billing_subscriptions WHERE order_id=? AND store_id=? AND environment=?').get(data.orderId, expectedStore, environment) as Subscription | undefined;
    const checkoutId = data.orderMerchantExternalId;
    const checkout = checkoutId ? this.db.prepare('SELECT * FROM billing_checkouts WHERE id=?').get(checkoutId) as Checkout | undefined : undefined;
    if (!existing && !checkout) return;
    if (checkout && (checkout.store_id !== expectedStore || checkout.environment !== environment || data.merchantProvidedBuyerIdentity !== checkout.identity)) return;
    if (existing && data.merchantProvidedBuyerIdentity && data.merchantProvidedBuyerIdentity !== existing.identity) return;
    if (existing && checkout && existing.identity !== checkout.identity) return;
    const identity = existing?.identity || checkout!.identity;
    let plan = existing?.plan || checkout!.plan;
    if (data.billingPeriod === 'monthly' || data.billingPeriod === 'yearly') plan = data.billingPeriod;
    // The initial subscription must match the signed server-selected checkout plan.
    const revocation = ['subscription.canceled', 'subscription.past_due', 'refund.succeeded'].includes(event.eventType);
    if (!existing && ((!revocation || data.billingPeriod) && data.billingPeriod !== checkout!.plan || data.orderMetadata?.checkoutId !== checkout!.id || data.orderMetadata?.plan !== checkout!.plan)) return;
    if (event.eventType === 'subscription.payment_succeeded') {
      // This is a charge receipt, not evidence of a new period or an active subscription.
      if (existing && data.paymentId && timestamp >= existing.event_time) this.db.prepare('UPDATE billing_subscriptions SET payment_id=? WHERE order_id=?').run(data.paymentId, data.orderId);
      return;
    }
    let update = STATE_EVENTS[event.eventType];
    if (event.eventType === 'refund.succeeded') {
      const refunded = Number(data.refundedAmount), original = Number(data.originalChargedAmount);
      if (!Number.isFinite(refunded) || !Number.isFinite(original) || original <= 0 || refunded < original) return;
      if (existing?.payment_id && data.paymentId !== existing.payment_id) return;
      update = ['refunded', 5];
    }
    if (!update) return;
    const [state, priority] = update;
    if (existing && (timestamp < existing.event_time || timestamp === existing.event_time && priority <= existing.event_priority)) return;
    const end = data.currentPeriodEnd ? Date.parse(data.currentPeriodEnd) : existing?.expires_at;
    if (ACTIVE.has(state) && (!end || !Number.isFinite(end))) return;
    // Revocations must take effect even if the gateway omits the period end.
    let expires = end && Number.isFinite(end) ? end : existing?.expires_at || timestamp;
    // Canceling overdue renewal must never restore suspended access. A later
    // recovery/renewal event is the evidence for a newly paid period.
    if (state === 'canceling' && existing && ['past_due', 'canceling'].includes(existing.state)) expires = Math.min(expires, existing.expires_at, existing.state === 'past_due' ? timestamp : Infinity);
    this.db.prepare(`INSERT INTO billing_subscriptions(order_id,identity,plan,state,expires_at,event_time,event_priority,payment_id,store_id,environment) VALUES (?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(order_id) DO UPDATE SET plan=excluded.plan,state=excluded.state,expires_at=excluded.expires_at,event_time=excluded.event_time,
      event_priority=excluded.event_priority,payment_id=COALESCE(excluded.payment_id,billing_subscriptions.payment_id)`)
      .run(data.orderId, identity, plan, state, expires, timestamp, priority, data.paymentId || null, expectedStore, environment);
    if (checkout) this.db.prepare("UPDATE billing_checkouts SET state='completed' WHERE id=?").run(checkout.id);
  }
  markCanceling(order: string, identity: string, status: 'canceling' | 'canceled' = 'canceling', now = Date.now()) {
    this.db.prepare(`UPDATE billing_subscriptions SET state=?,expires_at=CASE WHEN state='past_due' THEN MIN(expires_at,?) ELSE expires_at END,
      event_time=MAX(event_time,?),event_priority=?
      WHERE order_id=? AND identity=? AND store_id=? AND environment=? AND state IN ('active','past_due')`).run(status, now, now, status === 'canceled' ? 4 : 2, order, identity, this.storeId, this.environment);
  }
}
