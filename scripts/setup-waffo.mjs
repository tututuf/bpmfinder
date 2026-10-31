import env from '@next/env';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { WaffoPancake, BillingPeriod, TaxCategory } from '@waffo/pancake-ts';

// Read-only by default. Mutating options never create a checkout or a charge.
env.loadEnvConfig(process.cwd());
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const publish = apply && args.has('--publish');
const storeId = process.env.WAFFO_STORE_ID;
const mode = process.env.WAFFO_ENVIRONMENT === 'test' ? 'test' : 'prod';
if (!storeId) throw new Error('Set WAFFO_STORE_ID first.');
const client = new WaffoPancake({ merchantId: process.env.WAFFO_MERCHANT_ID, privateKey: process.env.WAFFO_PRIVATE_KEY, environment: mode });
const plans = {
  monthly: { name: 'BPM Finder Pro Monthly', amount: '7.99', period: BillingPeriod.Monthly, env: 'WAFFO_MONTHLY_PRODUCT_ID' },
  yearly: { name: 'BPM Finder Pro Yearly', amount: '35.88', period: BillingPeriod.Yearly, env: 'WAFFO_YEARLY_PRODUCT_ID' },
};
const events = ['subscription.activated', 'subscription.renewed', 'subscription.recovered', 'subscription.uncanceled', 'subscription.plan_changed', 'subscription.canceling', 'subscription.canceled', 'subscription.past_due', 'subscription.payment_succeeded', 'refund.succeeded'];
const query = `query($storeId:String!){
  store(id:$storeId){id name status prodEnabled payinEnable storeWebhooks{id url events testMode}}
  subscriptionProducts(storeId:$storeId){id name billingPeriod status metadata hasProdVersion prices{currency priceInfo{amount taxCategory}}}
}`;
async function catalog() {
  const r = await client.graphql.query({ query, variables: { storeId } });
  if (r.errors?.length || !r.data?.store) throw new Error('Could not read the selected Waffo store.');
  return r.data;
}
const data = await catalog();
console.log(JSON.stringify({ store: { id: data.store.id, name: data.store.name, prodEnabled: data.store.prodEnabled, payinEnable: data.store.payinEnable }, apply, publish }));
await mkdir('.data', { recursive: true });
const cachePath = `.data/waffo-setup-${mode}.json`;
let cache;
try { cache = JSON.parse(await readFile(cachePath, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
if (!cache || cache.storeId !== storeId) cache = { storeId, products: {} };
const save = () => writeFile(cachePath, JSON.stringify(cache, null, 2) + '\n', { mode: 0o600 });
const key = name => `bpm-setup-${createHash('sha256').update(`${storeId}/${mode}/${name}`).digest('hex')}`;
const ids = {};
for (const [plan, spec] of Object.entries(plans)) {
  const configured = process.env[spec.env] || cache.products[plan];
  let product = configured ? data.subscriptionProducts.find(p => p.id === configured) : data.subscriptionProducts.find(p => p.name === spec.name && p.billingPeriod === spec.period && p.prices.some(p => p.currency === 'USD' && p.priceInfo.amount === spec.amount));
  if (configured && !product) throw new Error(`Configured ${plan} product is absent from the selected store.`);
  if (!product && !apply) { console.log(JSON.stringify({ plan, action: 'would-create', amount: spec.amount })); continue; }
  if (!product) {
    const result = await client.subscriptionProducts.create({ storeId, name: spec.name, billingPeriod: spec.period,
      prices: { USD: { amount: spec.amount, taxCategory: TaxCategory.SaaS } },
      description: 'Energy, danceability and happiness insights, track details and full CSV results.',
      metadata: { application: 'bpmfinder', plan },
    }, { idempotencyKey: key(`${plan}/create/v1`) });
    cache.products[plan] = result.product.id; await save();
    product = (await catalog()).subscriptionProducts.find(p => p.id === result.product.id);
  }
  if (!product || product.billingPeriod !== spec.period || product.status !== 'active' || !product.prices.some(p => p.currency === 'USD' && Number(p.priceInfo.amount) === Number(spec.amount) && p.priceInfo.taxCategory === TaxCategory.SaaS)) throw new Error(`${plan} product does not match the agreed active USD plan.`);
  if (publish && !product.hasProdVersion) await client.subscriptionProducts.publish({ id: product.id }, { idempotencyKey: key(`${plan}/publish/v1`) });
  cache.products[plan] = product.id; ids[spec.env] = product.id; if (apply) await save();
  console.log(JSON.stringify({ plan, id: product.id, amount: spec.amount, hasProdVersion: product.hasProdVersion || publish }));
}
if (apply && Object.keys(ids).length === 2) {
  let local = await readFile('.env.local', 'utf8');
  for (const [name, id] of Object.entries(ids)) {
    const line = `${name}=${id}`;
    local = new RegExp(`^${name}=.*$`, 'm').test(local) ? local.replace(new RegExp(`^${name}=.*$`, 'm'), line) : local.trimEnd() + '\n' + line + '\n';
  }
  await writeFile('.env.local', local, { mode: 0o600 });
}
if (args.has('--webhook')) {
  if (!apply) throw new Error('--webhook requires --apply and a deployed public endpoint.');
  const callback = new URL(process.env.WAFFO_WEBHOOK_URL || '');
  if (callback.protocol !== 'https:' || callback.pathname !== '/api/billing/webhook' || callback.username || callback.password || callback.search || callback.hash || /^(localhost|127\.|\[::1\])/.test(callback.hostname)) throw new Error('Set WAFFO_WEBHOOK_URL to the deployed HTTPS /api/billing/webhook endpoint.');
  // Fail before registration if the endpoint does not enforce signature verification.
  const probe = await fetch(callback, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  if (probe.status !== 401) throw new Error('The public webhook endpoint is not ready (unsigned probe must return 401).');
  const existing = data.store.storeWebhooks.find(h => h.url === callback.href && h.testMode === (mode === 'test'));
  if (existing) {
    if (events.some(e => !existing.events.includes(e))) throw new Error('Existing webhook is missing subscription/refund events; update it in the dashboard.');
    console.log(JSON.stringify({ webhook: 'already-registered', id: existing.id }));
  } else {
    const result = await client.webhooks.add({ storeId, channel: 'http', url: callback.href, events, testMode: mode === 'test' }, { idempotencyKey: key(`webhook/${callback.href}/v1`) });
    console.log(JSON.stringify({ webhook: 'registered', id: result.webhook?.id }));
  }
}
console.log(JSON.stringify({ configured: Object.keys(ids), salesFlagsUnchanged: true, checkoutCreated: false }));
