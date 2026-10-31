import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import env from '@next/env';
import { encode } from 'next-auth/jwt';
import { BillingStore } from '../src/lib/billing-store.ts';
import { createDemo } from '../src/lib/demo.ts';

env.loadEnvConfig(process.cwd());
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const out = 'artifacts/billing';
await mkdir(out, { recursive: true });
const db = new DatabaseSync(resolve(process.env.AUTH_DATABASE_PATH || '.data/accounts.sqlite'));
db.exec('PRAGMA busy_timeout=5000');
new BillingStore(db, process.env.WAFFO_STORE_ID, process.env.WAFFO_ENVIRONMENT || 'prod');
const identity = `bpm_fixture_${randomUUID()}`, order = `fixture_order_${randomUUID()}`;
const checks = [], errors = [], models = [];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const api = await request.newContext({ baseURL: base });
function listen(page) { page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (/\/models\//.test(r.url())) models.push(r.url()); }); }
async function upload(page) {
  await page.locator('input[type=file]').setInputFiles({ name: 'Billing test groove.wav', mimeType: 'audio/wav', buffer: Buffer.from(await createDemo(0).arrayBuffer()) });
  await page.locator('tbody .bpm-value').waitFor({ timeout: 120000 });
  await page.locator('.results-heading .spin').waitFor({ state: 'hidden' });
}
async function csv(page, name) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await download).saveAs(`${out}/${name}.csv`);
  return readFile(`${out}/${name}.csv`, 'utf8');
}
async function basicCsv(page, name = 'free') {
  const text = await csv(page, name);
  assert.doesNotMatch(text, /Energy|Danceability|Happiness/);
}

function fixture(state, expires = Date.now() + 3600000) {
  db.prepare(`INSERT INTO billing_subscriptions(order_id,identity,plan,state,expires_at,event_time,event_priority,store_id,environment)
    VALUES (?,?,?,?,?,?,1,?,?) ON CONFLICT(order_id) DO UPDATE SET state=excluded.state,expires_at=excluded.expires_at`)
    .run(order, identity, 'monthly', state, expires, Date.now(), process.env.WAFFO_STORE_ID, process.env.WAFFO_ENVIRONMENT || 'prod');
}
try {
  assert.equal((await (await api.get('/api/billing/status')).json()).hasPro, false);
  assert.equal((await api.post('/api/billing/checkout', { headers: { origin: base }, data: { plan: 'monthly' } })).status(), 401);
  assert.equal((await api.post('/api/billing/checkout', { headers: { origin: 'https://unrelated.example' }, data: { plan: 'monthly' } })).status(), 403);
  assert.equal((await api.post('/api/billing/cancel', { headers: { origin: base }, data: {} })).status(), 401);
  assert.equal((await api.post('/api/billing/webhook', { data: { eventType: 'subscription.activated' } })).status(), 401);
  assert.equal((await api.post('/api/billing/webhook', { headers: { 'x-waffo-signature': 't=1,v1=invalid' }, data: {} })).status(), 401);
  checks.push('Guest checkout/cancel rejected; wrong-origin checkout rejected; unsigned/invalid webhooks rejected');

  const guest = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  const page = await guest.newPage(); listen(page);
  await page.goto(base, { waitUntil: 'networkidle' }); await upload(page);
  assert.equal(await page.locator('tbody .metric-lock').count(), 3);
  assert.equal(models.length, 0, 'Free analysis does not request mood model files');
  assert.doesNotMatch(await page.getByRole('button', { name: 'Export CSV', exact: true }).innerText(), /PRO/);
  await page.getByRole('button', { name: 'View analysis of Billing test groove', exact: true }).click();
  assert.equal(await page.locator('.inspector-pro .locked-insights>span').count(), 3);
  assert.equal(await page.locator('.insight-metric').count(), 0);
  await page.screenshot({ path: `${out}/free-inspector.png` });
  await page.getByRole('button', { name: 'Close track details', exact: true }).click();
  await page.locator('.results').screenshot({ path: `${out}/free-results.png` });
  await basicCsv(page, 'guest-free');
  await page.goto(`${base}/billing/return?status=success&hasPro=true`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Sign in to check your plan.', exact: true }).waitFor();
  assert.equal((await (await guest.request.get(`${base}/api/billing/status`)).json()).hasPro, false);
  checks.push('Real free audio analysis: three locked metrics, no mood model requests, locked inspector; CSV downloads freely without paid insight columns; fake return URL grants nothing');
  await page.goto(`${base}/pricing`, { waitUntil: 'networkidle' });
  for (const width of [375, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Pricing overflow at ${width}`);
    assert.equal(await page.locator('.price-card').count(), 3);
    assert.equal(await page.locator('.pro-price-card .plan-price strong').allTextContents().then(x => x.join('/')), '7.99/2.99');
    assert.match(await page.locator('.yearly-price-card .plan-billing').innerText(), /35.88/);
    if ([390, 768, 1440].includes(width)) await page.screenshot({ path: `${out}/pricing-${width}.png`, fullPage: true });
  }
  checks.push('Exact monthly/yearly prices and three responsive cards at 375–1440px');
  await guest.close();

  // Synthetic encrypted session + isolated database fixture test entitlement/UI.
  // No provider checkout, payment or Google account authorization is simulated as real.
  const token = await encode({ token: { sub: identity, billingIdentity: identity, name: 'Billing fixture', email: 'billing@example.test' }, secret: process.env.NEXTAUTH_SECRET, maxAge: 3600 });
  const signed = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
  await signed.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
  const paid = await signed.newPage(); listen(paid);
  await paid.goto(base, { waitUntil: 'networkidle' }); await upload(paid);
  assert.equal(await paid.locator('tbody .metric-lock').count(), 3);
  fixture('active');
  await paid.evaluate(() => window.dispatchEvent(new Event('focus')));
  await paid.getByRole('button', { name: 'Analyze with Pro', exact: true }).waitFor();
  await paid.getByRole('button', { name: 'Analyze with Pro', exact: true }).click();
  await paid.locator('tbody .bpm-value').waitFor({ timeout: 180000 });
  await paid.locator('.results-heading .spin').waitFor({ state: 'hidden', timeout: 180000 });
  assert.equal(await paid.locator('tbody .metric-lock').count(), 0);
  const values = await paid.locator('tbody .metric-cell .mono').allTextContents();
  for (const value of values) assert.match(value, /^\d+(\.\d+)?$/, `Real Pro measurement missing: ${values}`);
  assert.equal(values.length, 3);
  assert.ok(models.length > 0, 'Pro analysis actually runs mood models');
  assert.match(await csv(paid, 'pro'), /Energy.*RMS.*Danceability.*Happiness/);
  await paid.getByRole('button', { name: 'View analysis of Billing test groove', exact: true }).click();
  assert.equal(await paid.locator('.insight-metric').count(), 3);
  assert.equal(await paid.locator('.inspector-pro').count(), 0);
  await paid.screenshot({ path: `${out}/pro-inspector.png` });
  await paid.getByRole('button', { name: 'Close track details', exact: true }).click();
  await paid.locator('.results').screenshot({ path: `${out}/pro-results.png` });
  checks.push(`Isolated active fixture: free-to-Pro reanalysis on retained File, real model scores (${values.join('/')}), full inspector/CSV`);

  fixture('active', Date.now() - 1);
  // Export refreshes the server entitlement even before the periodic UI refresh.
  await basicCsv(paid, 'expired-free');
  fixture('past_due'); await paid.goto(`${base}/pricing`, { waitUntil: 'networkidle' });
  await paid.getByText('Your renewal payment is overdue. Pro access is paused.', { exact: true }).waitFor();
  await paid.getByRole('button', { name: 'Cancel renewal', exact: true }).click();
  assert.match(await paid.locator('.cancel-confirm').innerText(), /No further renewals/);
  await paid.getByRole('button', { name: 'Keep subscription', exact: true }).click();
  assert.equal(await paid.locator('.cancel-confirm').count(), 0);
  assert.equal((await (await api.get('/api/billing/status')).json()).hasPro, false);
  checks.push('Expired Pro exports basic CSV freely, excluding paid insight columns; overdue subscribers can cancel; other users stay free');
  await signed.close();
  assert.deepEqual(errors, []);
  const report = { checks, errors, fixture: 'Synthetic local session/database only; real audio/model execution', livePayment: 'Not attempted; no checkout or charge created' };
  await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report, null, 2));
} finally {
  db.prepare('DELETE FROM billing_subscriptions WHERE order_id=? AND identity=?').run(order, identity);
  db.close(); await api.dispose(); await browser.close();
}
