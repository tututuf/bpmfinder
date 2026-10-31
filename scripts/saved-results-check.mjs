// Isolated local sessions/database only. Never sends email or creates a payment.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID, createHash } from 'node:crypto';
import env from '@next/env';
import { encode } from 'next-auth/jwt';
import { AccountStore } from '../src/lib/account-store.ts';
import { BillingStore } from '../src/lib/billing-store.ts';
import { hashPassword } from '../src/lib/account-security.ts';

env.loadEnvConfig(process.cwd());
const base = process.env.BASE_URL || 'http://localhost:3001';
const development = process.argv.includes('--development');
const database = process.env.CHECK_DATABASE || '.cache/saved-results-verification.sqlite';
const accountStore = new AccountStore(database), db = accountStore.db;
const storeId = process.env.WAFFO_STORE_ID || '', mode = process.env.WAFFO_ENVIRONMENT || 'prod';
new BillingStore(db, storeId, mode);
const userId = randomUUID(), email = `save-${userId}@example.test`, password = `local-${randomUUID()}`;
const identity = `bpm_user_${createHash('sha256').update(JSON.stringify(['credentials', userId])).digest('hex')}`;
const otherIdentity = `saved-fixture-${randomUUID()}`, order = `saved-check-${randomUUID()}`;
const now = Date.now();
db.prepare('INSERT INTO accounts(id,email,name,password_hash,verified_at,created_at) VALUES (?,?,?,?,?,?)').run(userId, email, 'Saved fixture', await hashPassword(password), now, now);
const setPro = (active = true) => db.prepare(`INSERT INTO billing_subscriptions(order_id,identity,plan,state,expires_at,event_time,event_priority,store_id,environment)
 VALUES (?,?,?,'active',?,?,1,?,?) ON CONFLICT(order_id) DO UPDATE SET expires_at=excluded.expires_at`).run(order, identity, 'monthly', active ? Date.now() + 3600000 : Date.now() - 1000, Date.now(), storeId, mode);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [], checks = [];
const out = `artifacts/saved-results/${development ? 'development' : 'production'}`;
await mkdir(out, { recursive: true });
const sample = { id: randomUUID(), name: 'Server fixture', status: 'ready', duration: 32.04, bpm: 120, key: 'B major', camelot: '1B', energy: 68, color: 'blue', analysisVersion: 'commercial-clap-2' };
const headers = { origin: base, 'Content-Type': 'application/json' };
async function context(owner, includeIdentity = true) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  if (owner) await context.addCookies([{ name: 'next-auth.session-token', value: await encode({ token: { sub: owner, ...(includeIdentity ? { billingIdentity: owner } : {}), name: 'Saved fixture', email }, secret: process.env.NEXTAUTH_SECRET, maxAge: 3600 }), url: base, httpOnly: true, sameSite: 'Lax' }]);
  return context;
}
async function exportCsv(page, path) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await download).saveAs(path);
  return readFile(path, 'utf8');
}
try {
  const guest = await context(), other = await context(otherIdentity), signed = await context(identity);
  const legacy = await context(`older-session-${randomUUID()}`, false);
  for (const [name, account] of [['empty-account', signed], ['older-session', legacy]]) {
    const empty = await account.newPage(); empty.on('pageerror', e => errors.push(e.message));
    await empty.goto(`${base}/saved-results`, { waitUntil: 'networkidle' });
    await empty.getByRole('button', { name: 'Your account', exact: true }).waitFor();
    await empty.getByRole('heading', { name: 'No saved results yet.', exact: true }).waitFor();
    assert.equal(await empty.getByText('Sign in to revisit the results you saved with Pro.', { exact: true }).count(), 0);
    assert.equal(await empty.getByRole('link', { name: 'Sign in', exact: true }).count(), 0);
    assert.equal(await empty.locator('.saved-loading').count(), 0);
    for (const width of [1440, 390]) {
      await empty.setViewportSize({ width, height: 1000 });
      await empty.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (name === 'empty-account') await empty.screenshot({ path: `${out}/empty-${width}.png`, fullPage: true });
      const bounds = await empty.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: Array.from(document.querySelectorAll('body *')).map(el => ({ tag: el.tagName, class: el.className, fontSize: getComputedStyle(el).fontSize, width: getComputedStyle(el).width, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })).filter(el => el.left < -1 || el.right > innerWidth + 1).slice(0, 12) }));
      assert.ok(bounds.scroll <= width, `Empty history overflow at ${width}: ${JSON.stringify(bounds)}`);
    }
    await empty.evaluate(() => { window.__emptyResultsMarker = 'same-document'; });
    await empty.getByRole('link', { name: 'Analyze your first track', exact: true }).click();
    await empty.waitForURL(`${base}/#workspace`); await empty.locator('input[type=file]').waitFor({ state: 'attached' });
    assert.equal(await empty.evaluate(() => window.__emptyResultsMarker), 'same-document');
    await empty.close();
  }
  await legacy.close();
  checks.push('Signed-in empty accounts and older sessions show an empty state without a sign-in prompt; tools CTA navigates without reloading at mobile/desktop widths');
  const api = signed.request;
  assert.equal((await guest.request.get(`${base}/api/results`)).status(), 401);
  assert.equal((await guest.request.post(`${base}/api/results`, { headers, data: { requestId: randomUUID(), tracks: [sample] } })).status(), 401);
  assert.equal((await api.post(`${base}/api/results`, { headers: { ...headers, origin: 'https://unrelated.example' }, data: {} })).status(), 403);
  if (!development) assert.equal((await api.post(`${base}/api/results`, { headers, data: { requestId: randomUUID(), tracks: [sample] } })).status(), 403);
  setPro();
  assert.equal((await api.post(`${base}/api/results`, { headers, data: { requestId: randomUUID(), tracks: [{ ...sample, duration: -1 }] } })).status(), 400);
  assert.equal((await api.post(`${base}/api/results`, { headers: { ...headers, 'Content-Type': 'text/plain' }, data: '{}' })).status(), 415);
  assert.equal((await api.post(`${base}/api/results`, { headers, data: { extra: 'x'.repeat(512 * 1024 + 1) } })).status(), 413);
  const requestId = randomUUID(), payload = { requestId, tracks: [{ ...sample, audio: 'must-not-persist' }] };
  const response = await api.post(`${base}/api/results`, { headers, data: payload });
  assert.equal(response.status(), 201, await response.text());
  const saved = (await response.json()).result;
  const retry = await api.post(`${base}/api/results`, { headers, data: payload });
  assert.equal((await retry.json()).result.id, saved.id);
  assert.equal((await api.get(`${base}/api/results`)).headers()['cache-control'], 'no-store');
  assert.equal((await api.get(`${base}/api/results?before=invalid`)).status(), 400);
  assert.deepEqual((await (await other.request.get(`${base}/api/results`)).json()).results, []);
  assert.equal((await other.request.get(`${base}/api/results/${saved.id}`)).status(), 404);
  assert.equal((await other.request.delete(`${base}/api/results/${saved.id}`, { headers, data: {} })).status(), 404);
  assert.equal(Object.hasOwn((await (await api.get(`${base}/api/results/${saved.id}`)).json()).result.tracks[0], 'audio'), false);
  setPro(false);
  assert.equal((await api.get(`${base}/api/results/${saved.id}`)).status(), 200);
  if (!development) assert.equal((await api.post(`${base}/api/results`, { headers, data: { requestId: randomUUID(), tracks: [sample] } })).status(), 403);
  assert.equal((await api.delete(`${base}/api/results/${saved.id}`, { headers, data: {} })).status(), 200);
  checks.push('Server auth/Pro/expiry/origin/type/size/validation/idempotency/ownership/no-store; existing snapshots readable/deletable after expiry');

  // Real audio upload: free CSV, no automatic database save, and client-side login handoff.
  const page = await guest.newPage(); page.on('pageerror', e => errors.push(e.message));
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles('C:/Users/qq242/Downloads/beansandsausages-drum-loop-120-bpm-rock-funk-groove-553903.mp3');
  await page.locator('tbody .bpm-value').waitFor({ timeout: 120000 });
  assert.equal(await page.locator('tbody .bpm-value').textContent(), '120');
  assert.doesNotMatch(await page.getByRole('button', { name: 'Export CSV', exact: true }).innerText(), /PRO/);
  const freeCsv = await exportCsv(page, `${out}/guest.csv`);
  assert.match(freeCsv, /120/);
  assert.equal(await page.locator('tbody .metric-lock').count(), 3); assert.doesNotMatch(freeCsv, /Energy|Danceability|Happiness/);
  await page.evaluate(() => { window.__saveUpgradeMarker = 'same-document'; });
  await page.getByRole('checkbox', { name: 'Save Results', exact: true }).click();
  await page.waitForURL(base + '/pricing');
  assert.equal(await page.evaluate(() => window.__saveUpgradeMarker), 'same-document', 'Guests go directly to Pricing without a full reload');
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.waitForURL('**/login?**');
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await page.waitForURL(base + '/pricing');
  await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click();
  await page.locator('tbody .bpm-value').waitFor();
  assert.equal(await page.locator('tbody .bpm-value').textContent(), '120', 'SPA login keeps the explicitly retained in-memory workspace');
  await page.waitForFunction(() => !!document.querySelector('.auth-account'));
  assert.equal((await (await guest.request.get(`${base}/api/results`)).json()).results.length, 0, 'Analyzing/login never automatically saves');
  if (!development) {
    await page.getByRole('checkbox', { name: 'Save Results', exact: true }).click(); await page.waitForURL('**/pricing');
    assert.equal(await page.evaluate(() => window.__saveUpgradeMarker), 'same-document', 'Signed-in Free users also use client navigation to Pricing');
    await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click(); await page.locator('tbody .bpm-value').waitFor();
    setPro(); await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button', { name: 'Analyze with Pro', exact: true }).waitFor();
  }
  const saveCheckbox = page.getByRole('checkbox', { name: 'Save Results', exact: true });
  assert.equal(await saveCheckbox.isChecked(), false);
  assert.equal(await page.getByRole('button', { name: 'Save Results', exact: true }).count(), 0);
  const moodOption = page.getByRole('checkbox', { name: /Include danceability/ });
  if (await moodOption.count()) await moodOption.uncheck();
  await saveCheckbox.click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Save Results"]').checked);
  assert.equal((await (await guest.request.get(base + '/api/results')).json()).results.length, 0, 'Selecting the checkbox never backfills previous results');
  await page.getByRole('button', { name: /View analysis of/, exact: false }).click();
  await page.getByLabel('Track BPM', { exact: true }).fill('121');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal((await (await guest.request.get(base + '/api/results')).json()).results.length, 0, 'Editing existing results never creates history');
  const audio = await readFile('C:/Users/qq242/Downloads/beansandsausages-drum-loop-120-bpm-rock-funk-groove-553903.mp3');
  await page.locator('input[type=file]').setInputFiles(['First new track.mp3', 'Second new track.mp3'].map(name => ({ name, mimeType: 'audio/mpeg', buffer: audio })));
  await page.locator('.save-result-confirmation').filter({ hasText: '2 results added to your history.' }).waitFor({ timeout: 120000 });
  let list = (await (await guest.request.get(base + '/api/results')).json()).results;
  assert.equal(list.length, 2, 'Every subsequent analysis is saved without another click');
  assert.ok(list.every(item => !item.preview.includes('beansandsausages')));
  // Simulate a lost success response: retry uses the original request ID and cannot duplicate a committed save.
  let lostResponse = false;
  await page.route('**/api/results', async route => {
    if (route.request().method() !== 'POST' || lostResponse) return route.continue();
    lostResponse = true;
    const response = await route.fetch(); assert.equal(response.status(), 201);
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary save connection failure.' }) });
  });
  await page.locator('input[type=file]').setInputFiles({ name: 'Retry track.mp3', mimeType: 'audio/mpeg', buffer: audio });
  await page.getByRole('button', { name: 'Retry saving', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await page.locator('.save-result-confirmation').filter({ hasText: '3 results added to your history.' }).waitFor();
  await page.unroute('**/api/results');
  list = (await (await guest.request.get(base + '/api/results')).json()).results; assert.equal(list.length, 3);
  await saveCheckbox.uncheck();
  await page.locator('input[type=file]').setInputFiles({ name: 'Unsaved new track.mp3', mimeType: 'audio/mpeg', buffer: audio });
  await page.locator('tbody tr').filter({ hasText: 'Unsaved new track' }).locator('.bpm-value').waitFor();
  assert.equal((await (await guest.request.get(base + '/api/results')).json()).results.length, 3, 'Unchecking stops subsequent saving');
  await saveCheckbox.click();
  await page.waitForFunction(() => document.querySelector('input[aria-label="Save Results"]').checked);
  await page.getByLabel('Search tracks', { exact: true }).fill('nothing matches');
  await page.getByLabel('Search tracks', { exact: true }).fill('');
  assert.equal((await (await guest.request.get(base + '/api/results')).json()).results.length, 3, 'Re-enabling, filtering and rendering never backfill or duplicate history');
  const detail = (await (await guest.request.get(base + '/api/results/' + list[0].id)).json()).result;
  assert.equal(detail.tracks[0].bpm, 120); assert.equal(detail.tracks[0].bpmEdited, false);
  assert.equal(detail.tracks[0].camelot, '10B');
  const controls = await signed.newPage();
  await controls.goto(base, { waitUntil: 'networkidle' });
  const controlCheckbox = controls.getByRole('checkbox', { name: 'Save Results', exact: true });
  await controlCheckbox.click();
  await controls.waitForFunction(() => document.querySelector('input[aria-label="Save Results"]').checked);
  if (!development) {
    setPro(false); await controls.evaluate(() => window.dispatchEvent(new Event('focus')));
    await controls.waitForFunction(() => !document.querySelector('input[aria-label="Save Results"]').checked);
    setPro(); await controls.evaluate(() => window.dispatchEvent(new Event('focus')));
    await controls.getByRole('checkbox', { name: /Include danceability/ }).waitFor();
    assert.equal(await controlCheckbox.isChecked(), false, 'Renewed access never silently re-enables saving');
    await controlCheckbox.click();
    await controls.waitForFunction(() => document.querySelector('input[aria-label="Save Results"]').checked);
  }
  await controls.getByRole('button', { name: 'Your account', exact: true }).click();
  await controls.getByRole('button', { name: 'Sign out', exact: true }).click();
  await controls.waitForFunction(() => !document.querySelector('input[aria-label="Save Results"]').checked);
  await controls.close();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator('.workspace').screenshot({ path: `${out}/options-${width}.png` });
    await page.locator('.results').screenshot({ path: `${out}/workspace-${width}.png` });
    const bounds = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, overflow: Array.from(document.querySelectorAll('body *')).map(el => ({ tag: el.tagName, class: el.className, left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })).filter(el => el.left < -1 || el.right > innerWidth + 1).slice(0, 15) }));
    assert.ok(bounds.scroll <= width, `Workspace overflow ${JSON.stringify(bounds)}`);
  }
  await page.evaluate(() => { window.__savedNavigationMarker = 'same-document'; });
  await page.locator('.save-result-confirmation a').click(); await page.waitForURL('**/saved-results');
  assert.equal(await page.evaluate(() => window.__savedNavigationMarker), 'same-document', 'Saved Results navigation keeps the current document');
  await page.locator('.saved-session').first().click(); await page.locator('.saved-table').waitFor();
  assert.equal(await page.locator('.saved-table tbody tr:first-child td:nth-child(5)').textContent(), '10B');
  assert.match(await page.locator('.saved-table').innerText(), /120/);
  await page.reload(); await page.locator('.saved-session').first().click(); await page.locator('.saved-table').waitFor();
  const historicalCsv = await exportCsv(page, `${out}/saved.csv`); assert.match(historicalCsv, /120/);
  for (const width of [375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `History overflow${width}`);
    if ([390,1440].includes(width)) await page.screenshot({ path: `${out}/history-${width}.png`, fullPage: true });
  }
  if (!development) { setPro(false); await page.evaluate(() => window.dispatchEvent(new Event('focus'))); }
  await page.getByRole('button', { name: 'Delete saved results', exact: true }).click();
  await page.getByRole('button', { name: 'Delete results', exact: true }).click();
  await page.locator('.saved-session').first().waitFor();
  assert.equal((await (await guest.request.get(`${base}/api/results`)).json()).results.length, 2);
  await page.goto(`${base}/saved-results`); await page.getByRole('button', { name: 'Your account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('heading', { name: 'Your results, ready for an encore.', exact: true }).waitFor();
  assert.equal(await page.locator('.saved-session').count(), 0);
  checks.push('Real MP3 free CSV; paid opt-in checkbox; no backfill/edit/filter writes; subsequent batch autosave; idempotent failed-response retry; uncheck stops saving; SPA login/history navigation; reload/CSV/delete/logout; 375–1440px bounds');
  assert.deepEqual(errors, []);
  await writeFile(`${out}/report.json`, JSON.stringify({ development, checks, errors, livePayment: false, emailSent: false }, null, 2));
  console.log(JSON.stringify({ development, checks, errors }, null, 2));
} finally {
  db.prepare('DELETE FROM billing_subscriptions WHERE order_id=?').run(order);
  db.prepare('DELETE FROM accounts WHERE id=?').run(userId);
  db.prepare('DELETE FROM saved_results WHERE identity IN (?,?)').run(identity, otherIdentity);
  await browser.close(); db.close();
}
