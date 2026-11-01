import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

await mkdir('artifacts/cloudflare-deploy', { recursive: true });
await build({
  stdin: { contents: `export {AppDatabase} from './cloudflare/database.ts';
import {hashPassword,verifyPassword} from './src/lib/account-security.ts';
export default {async fetch(){const hash=await hashPassword('1');return Response.json({matches:await verifyPassword('1',hash),rejects:!await verifyPassword('2',hash)});}};`, resolveDir: process.cwd(), sourcefile: 'cloudflare-check.ts' },
  bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', external: ['node:*', 'cloudflare:*'], outfile: 'artifacts/cloudflare-deploy/storage-worker.mjs',
});
const options = convertV4MiniflareOptions({ workers: [{ name: 'storage-check', modules: true, scriptPath: 'artifacts/cloudflare-deploy/storage-worker.mjs', compatibilityDate: '2026-10-30', compatibilityFlags: ['nodejs_compat'], durableObjects: { APP_DATABASE: { className: 'AppDatabase', useSQLite: true } } }], resourcePersistencePath: 'artifacts/cloudflare-deploy/test-storage' });
let runtime = new Miniflare(options);
let namespace = await runtime.getDurableObjectNamespace('APP_DATABASE');
const id = namespace.idFromName(`check-${crypto.randomUUID()}`);
const idText = id.toString();
let stub = namespace.get(id);
const scope = { store: 'STO_test', environment: 'prod' };
const call = async (group, method, args = []) => {
  const response = await stub.fetch('https://database.internal/call', { method: 'POST', body: JSON.stringify({ group, method, args, ...scope }) });
  const text = await response.text();
  return { status: response.status, ...(response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : { error: text }) };
};
try {
  const cryptoCheck = await (await runtime.dispatchFetch('https://check.internal/')).json();
  assert.deepEqual(cryptoCheck, { matches: true, rejects: true });
  const now = Date.now(); const email = `${crypto.randomUUID()}@example.test`; const hash = 'a'.repeat(64);
  const reservations = await Promise.all(Array.from({ length: 8 }, () => call('accounts', 'reserveCode', [email, hash, now])));
  assert.equal(reservations.filter(result => result.value.id).length, 1);
  const reservation = reservations.find(result => result.value.id).value;
  assert.equal((await call('accounts', 'register', [email, hash, 'salted', now])).value, false);
  await call('accounts', 'markDelivered', [email, reservation.id]);
  const registrations = await Promise.all(Array.from({ length: 8 }, () => call('accounts', 'register', [email, hash, 'salted', now])));
  assert.equal(registrations.filter(result => result.value === true).length, 1);
  assert.equal((await call('accounts', 'account', [email])).value.password_hash, 'salted');
  const checkouts = await Promise.all(Array.from({ length: 8 }, () => call('billing', 'reserveCheckout', ['alice', 'monthly', scope.store, scope.environment, now])));
  assert.equal(checkouts.filter(result => result.status === 200).length, 1);
  assert.equal(checkouts.filter(result => result.error === 'checkout-pending').length, 7);
  const checkout = checkouts.find(result => result.status === 200).value;
  const event = { id: crypto.randomUUID(), timestamp: new Date(now).toISOString(), eventType: 'subscription.activated', storeId: scope.store, mode: 'prod', data: { orderId: crypto.randomUUID(), orderMerchantExternalId: checkout, merchantProvidedBuyerIdentity: 'alice', billingPeriod: 'monthly', currentPeriodEnd: new Date(now + 3600000).toISOString(), orderMetadata: { checkoutId: checkout, plan: 'monthly' } } };
  assert.equal((await call('billing', 'enqueue', [event, now])).value, true);
  assert.equal((await call('billing', 'enqueue', [event, now])).value, false);
  await call('billing', 'processInbox', [scope.store, scope.environment, now]);
  assert.equal((await call('billing', 'entitlement', ['alice', now])).value.hasPro, true);
  const requestId = crypto.randomUUID(); const tracks = [{ name: 'Practice.wav', bpm: 120 }];
  const saved = (await call('results', 'save', ['alice', requestId, tracks, now])).value;
  assert.equal((await call('results', 'get', ['bob', saved.id])).value, null);
  assert.equal((await call('results', 'save', ['alice', requestId, [{ name: 'Changed.wav' }], now])).status, 409);
  assert.equal((await call('results', 'list', ['alice'])).value.results.length, 1);
  assert.equal((await call('results', 'list', ['alice', undefined])).value.results.length, 1, 'An omitted cursor serialized as null must return saved records');
  await runtime.dispose();
  runtime = new Miniflare(options); namespace = await runtime.getDurableObjectNamespace('APP_DATABASE'); stub = namespace.get(namespace.idFromString(idText));
  assert.equal((await call('accounts', 'account', [email])).value.password_hash, 'salted');
  assert.equal((await call('billing', 'entitlement', ['alice', now])).value.hasPro, true);
  assert.equal((await call('results', 'get', ['alice', saved.id])).value.tracks[0].bpm, 120);
  assert.equal((await call('results', 'delete', ['bob', saved.id])).value, false);
  assert.equal((await call('results', 'delete', ['alice', saved.id])).value, true);
  assert.equal((await call('accounts', 'constructor')).status, 400);
  const report = { passed: ['Worker scrypt password hashing and verification', 'Concurrent verification-code cooldown and single-use registration', 'Concurrent checkout reservation and duplicate webhook handling', 'Account-scoped results/idempotency conflict and deletion', 'Actual SQLite persistence after a workerd restart', 'Internal RPC operation allowlist'] };
  await writeFile('artifacts/cloudflare-deploy/storage-report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await runtime.dispose(); }


