import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyWebhook, WaffoPancake, TaxCategory } from '@waffo/pancake-ts';
import { BillingStore } from '../src/lib/billing-store.ts';
import { BILLING_PLANS, FREE_BILLING_STATUS, developmentSavingAccess } from '../src/lib/billing-plans.ts';
import { resultCsv } from '../src/lib/result-data.ts';
import { resultForAccess } from '../public/analysis-access.mjs';

const time = 1900000000000, storeId = 'STO_isolated', identity = 'bpm_user_isolated';
test('development saving access never grants Pro analysis or subscription access', () => {
  assert.equal(developmentSavingAccess('development'), true);
  assert.equal(FREE_BILLING_STATUS.hasPro, false);
  for (const runtime of ['production', 'test', '', undefined]) assert.equal(developmentSavingAccess(runtime), false);
});
const fixture = () => { const db = new DatabaseSync(':memory:'); return { db, billing: new BillingStore(db, storeId, 'prod') }; };
function event(id, checkout, overrides = {}) {
  return { id, timestamp: new Date(time).toISOString(), eventType: 'subscription.activated', storeId, mode: 'prod',
    data: { orderId: 'ORD_isolated', merchantProvidedBuyerIdentity: identity, orderMerchantExternalId: checkout, orderMetadata: { checkoutId: checkout, plan: 'monthly' }, billingPeriod: 'monthly', currentPeriodEnd: new Date(time + 3600000).toISOString(), paymentId: 'PAY_1' }, ...overrides };
}
function apply(billing, value) { billing.enqueue(value, time); billing.processInbox(storeId, 'prod', time); }

test('pricing matches the supplied monthly price and yearly total exactly', () => {
  assert.equal(BILLING_PLANS.monthly.amount, '7.99');
  assert.equal(BILLING_PLANS.yearly.amount, '35.88');
  assert.equal(BILLING_PLANS.yearly.monthlyAmount, '2.99');
  assert.equal(Math.round(Number(BILLING_PLANS.yearly.monthlyAmount) * 12 * 100), 3588);
});

test('checkout creation and success-page parameters grant no subscription', () => {
  const { db, billing } = fixture(); try {
    assert.equal(billing.entitlement(identity, time).hasPro, false);
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    billing.checkoutReady(checkout, 'cs_fixture', time + 600000);
    assert.equal(billing.entitlement(identity, time).hasPro, false);
    assert.throws(() => billing.reserveCheckout(identity, 'yearly', storeId, 'prod', time), /checkout-pending/);
    assert.ok(billing.reserveCheckout(identity, 'yearly', storeId, 'prod', time + 600001));
  } finally { db.close(); }
});

test('verified inbox activation is atomic, durable, single-use and expires on schedule', () => {
  const { db, billing } = fixture(); try {
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    const value = event('delivery-1', checkout);
    assert.equal(billing.enqueue(value, time), true);
    assert.equal(billing.entitlement(identity, time).hasPro, false);
    // A new process/instance can drain the committed inbox after acknowledgement.
    const resumed = new BillingStore(db, storeId, 'prod'); resumed.processInbox(storeId, 'prod', time);
    assert.equal(resumed.entitlement(identity, time).hasPro, true);
    assert.equal(resumed.entitlement(identity, time + 3600000).hasPro, false);
    assert.equal(resumed.entitlement('other-user', time).hasPro, false);
    assert.equal(billing.enqueue(value, time), false);
    resumed.processInbox(storeId, 'prod', time);
    assert.equal(db.prepare('SELECT count(*) AS n FROM billing_subscriptions').get().n, 1);
    assert.throws(() => billing.reserveCheckout(identity, 'yearly', storeId, 'prod', time), /already-subscribed/);
  } finally { db.close(); }
});

test('wrong store, environment, buyer, plan, metadata and unbound orders never grant access', () => {
  for (const change of ['store', 'environment', 'buyer', 'plan', 'metadata', 'unbound', 'no-end']) {
    const { db, billing } = fixture(); try {
      const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
      const value = event(`invalid-${change}`, checkout);
      if (change === 'store') value.storeId = 'STO_wrong';
      if (change === 'environment') value.mode = 'test';
      if (change === 'buyer') value.data.merchantProvidedBuyerIdentity = 'wrong';
      if (change === 'plan') value.data.billingPeriod = 'yearly';
      if (change === 'metadata') value.data.orderMetadata.checkoutId = 'unrelated';
      if (change === 'unbound') value.data.orderMerchantExternalId = 'unknown';
      if (change === 'no-end') delete value.data.currentPeriodEnd;
      apply(billing, value);
      assert.equal(billing.entitlement(identity, time).hasPro, false, change);
    } finally { db.close(); }
  }
});

test('charge receipts cannot activate or extend access; subscription renewal can', () => {
  const { db, billing } = fixture(); try {
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    apply(billing, event('receipt-first', checkout, { eventType: 'subscription.payment_succeeded' }));
    assert.equal(billing.entitlement(identity, time).hasPro, false);
    apply(billing, event('activated', checkout));
    const paid = event('receipt-renewal', checkout, { eventType: 'subscription.payment_succeeded', timestamp: new Date(time + 1000).toISOString() });
    paid.data.currentPeriodEnd = new Date(time + 7200000).toISOString();
    apply(billing, paid);
    assert.equal(billing.entitlement(identity, time + 3600001).hasPro, false);
    apply(billing, { ...paid, id: 'period-renewed', eventType: 'subscription.renewed' });
    assert.equal(billing.entitlement(identity, time + 3600001).hasPro, true);
  } finally { db.close(); }
});

test('canceling retains the paid period; final cancellation revokes; stale delivery cannot restore', () => {
  const { db, billing } = fixture(); try {
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    apply(billing, event('active', checkout));
    apply(billing, event('canceling', checkout, { eventType: 'subscription.canceling', timestamp: new Date(time + 1000).toISOString() }));
    assert.equal(billing.entitlement(identity, time + 1000).hasPro, true);
    assert.equal(billing.entitlement(identity, time + 3600001).hasPro, false);
    apply(billing, event('canceled', checkout, { eventType: 'subscription.canceled', timestamp: new Date(time + 2000).toISOString() }));
    assert.equal(billing.entitlement(identity, time + 2000).hasPro, false);
    apply(billing, event('late-old-renewal', checkout, { eventType: 'subscription.renewed', timestamp: new Date(time + 1500).toISOString() }));
    assert.equal(billing.entitlement(identity, time + 2000).hasPro, false);
    apply(billing, event('same-time-active', checkout, { timestamp: new Date(time + 2000).toISOString() }));
    assert.equal(billing.entitlement(identity, time + 2000).hasPro, false);
  } finally { db.close(); }
});

test('past due revokes access, recovery restores it; future-dated expiry alone cannot bypass revocation', () => {
  const { db, billing } = fixture(); try {
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    apply(billing, event('active', checkout));
    apply(billing, event('due', checkout, { eventType: 'subscription.past_due', timestamp: new Date(time + 1000).toISOString() }));
    assert.equal(billing.entitlement(identity, time).hasPro, false);
    assert.throws(() => billing.reserveCheckout(identity, 'yearly', storeId, 'prod', time + 1000), /already-subscribed/);
    apply(billing, event('recovered', checkout, { eventType: 'subscription.recovered', timestamp: new Date(time + 2000).toISOString() }));
    assert.equal(billing.entitlement(identity, time + 2000).hasPro, true);
  } finally { db.close(); }
});

test('full refund of current payment revokes; partial or previous-payment refunds do not', () => {
  const { db, billing } = fixture(); try {
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    apply(billing, event('active', checkout));
    const refunded = event('partial', checkout, { eventType: 'refund.succeeded', timestamp: new Date(time + 1000).toISOString() });
    refunded.data.refundedAmount = '1.00'; refunded.data.originalChargedAmount = '7.99';
    apply(billing, refunded); assert.equal(billing.entitlement(identity, time).hasPro, true);
    apply(billing, { ...refunded, id: 'old-refund', data: { ...refunded.data, refundedAmount: '7.99', paymentId: 'PAY_old' } });
    assert.equal(billing.entitlement(identity, time).hasPro, true);
    apply(billing, { ...refunded, id: 'full-refund', data: { ...refunded.data, refundedAmount: '7.99' } });
    assert.equal(billing.entitlement(identity, time).hasPro, false);
  } finally { db.close(); }
});

test('canceling an overdue subscription never restores suspended Pro access', () => {
  for (const cancelThroughApi of [false, true]) {
    const { db, billing } = fixture(); try {
      const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
      apply(billing, event('active', checkout));
      apply(billing, event('due', checkout, { eventType: 'subscription.past_due', timestamp: new Date(time + 1000).toISOString() }));
      if (cancelThroughApi) billing.markCanceling('ORD_isolated', identity, 'canceling', time + 1500);
      apply(billing, event('canceling', checkout, { eventType: 'subscription.canceling', timestamp: new Date(time + 2000).toISOString() }));
      assert.equal(billing.entitlement(identity, time + 2000).hasPro, false);
    } finally { db.close(); }
  }
});

test('free worker results omit paid measurements while basic CSV export stays free', () => {
  const track = { id: 'track', name: 'Example', status: 'ready', bpm: 120, key: 'A minor', camelot: '8A', duration: 20, energy: 79, rmsDb: -12, danceability: 83, happiness: 67, moodStatus: 'Model estimate', moodPatches: 5 };
  const free = resultForAccess(track);
  for (const key of ['energy', 'rmsDb', 'danceability', 'happiness', 'moodStatus', 'moodPatches']) assert.equal(Object.hasOwn(free, key), false);
  assert.equal(free.bpm, 120); assert.equal(track.energy, 79);
  assert.equal(resultForAccess(track, true).happiness, 67);
  assert.match(resultCsv([free]), /Example/);
  assert.doesNotMatch(resultCsv([track], false), /Energy|Danceability|Happiness|79|83|67/);
  assert.match(resultCsv([track], true), /Energy.*Danceability.*Happiness/);
});

test('production, test and different-store entitlements stay isolated in the same database', () => {
  const { db, billing } = fixture(); try {
    const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
    apply(billing, event('active', checkout));
    assert.equal(billing.entitlement(identity, time).hasPro, true);
    for (const [store, mode] of [[storeId, 'test'], ['STO_other', 'prod']]) {
      const isolated = new BillingStore(db, store, mode);
      assert.equal(isolated.entitlement(identity, time).hasPro, false);
      assert.ok(isolated.reserveCheckout(identity, 'monthly', store, mode, time));
    }
  } finally { db.close(); }
});

test('refund or cancellation delivered before activation blocks an older activation retry', () => {
  for (const eventType of ['refund.succeeded', 'subscription.canceled']) {
    const { db, billing } = fixture(); try {
      const checkout = billing.reserveCheckout(identity, 'monthly', storeId, 'prod', time);
      const revoke = event('revoked-first', checkout, { eventType, timestamp: new Date(time + 1000).toISOString() });
      delete revoke.data.billingPeriod;
      revoke.data.refundedAmount = '7.99'; revoke.data.originalChargedAmount = '7.99';
      apply(billing, revoke);
      apply(billing, event('activation-late', checkout));
      assert.equal(billing.entitlement(identity, time + 2000).hasPro, false);
      assert.equal(billing.subscription(identity, time).state, eventType === 'refund.succeeded' ? 'refunded' : 'canceled');
    } finally { db.close(); }
  }
});

test('SDK validates raw RSA-signed webhook fixtures, rejects tampering, expired signatures and wrong keys', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
  const body = JSON.stringify({ id: 'fixture-event', eventType: 'subscription.activated' });
  const stamp = String(Date.now());
  const header = `t=${stamp},v1=${sign('RSA-SHA256', Buffer.from(`${stamp}.${body}`), privateKey).toString('base64')}`;
  assert.equal(verifyWebhook(body, header, { publicKey: publicPem }).id, 'fixture-event');
  assert.throws(() => verifyWebhook(body + ' ', header, { publicKey: publicPem }));
  assert.throws(() => verifyWebhook(body, header, { environment: 'prod' }));
  assert.throws(() => verifyWebhook(body, `t=${Date.now() - 3600000},v1=invalid`, { publicKey: publicPem }));
  assert.throws(() => verifyWebhook(body, null));
});

test('authenticated SDK checkout signs requests, keeps buyer identity separate and passes exact price/idempotency', async () => {
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const calls = [];
  const client = new WaffoPancake({ merchantId: 'MER_0000000000000000000001', privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }), environment: 'prod',
    fetch: async (url, init) => {
      const path = new URL(url).pathname, body = JSON.parse(init.body);
      calls.push({ path, body, headers: init.headers });
      const data = path.endsWith('issue-session-token') ? { token: 'fixture-token', expiresAt: new Date(time + 600000).toISOString() }
        : { sessionId: 'fixture-session', checkoutUrl: 'https://pancake.waffo.ai/fixture', expiresAt: new Date(time + 600000).toISOString() };
      return Response.json({ data });
    },
  });
  const result = await client.checkout.authenticated.create({ productId: 'PROD_0000000000000000000001', currency: 'USD', buyerIdentity: identity, buyerEmail: 'fixture@example.test',
    priceSnapshot: { amount: BILLING_PLANS.yearly.amount, taxCategory: TaxCategory.SaaS }, withTrial: false, expiresInSeconds: 600,
    metadata: { checkoutId: 'fixture_checkout', plan: 'yearly' }, orderMerchantExternalId: 'fixture_checkout', successUrl: 'https://example.test/billing/return',
  }, { idempotencyKey: 'fixture_checkout' });
  const auth = calls.find(c => c.path.endsWith('issue-session-token')), checkout = calls.find(c => c.path.endsWith('create-session'));
  assert.equal(calls.length, 2);
  assert.equal(auth.body.buyerIdentity, identity);
  assert.equal(checkout.body.buyerIdentity, undefined);
  assert.equal(checkout.body.buyerEmail, 'fixture@example.test');
  assert.equal(checkout.body.priceSnapshot.amount, '35.88');
  assert.equal(checkout.body.withTrial, false);
  assert.equal(checkout.headers['X-Idempotency-Key'], 'fixture_checkout');
  for (const call of calls) assert.ok(call.headers['X-Signature']);
  assert.equal(new URL(result.checkoutUrl).hash, '#token=fixture-token');
});
