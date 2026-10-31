import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import nextEnv from '@next/env';
import { Resend } from 'resend';
import { AccountStore } from '../src/lib/account-store.ts';
import { verifyPassword } from '../src/lib/account-security.ts';

if (!process.argv.includes('--live-mail')) throw new Error('Pass --live-mail to send one verification message to the official Resend test inbox.');
nextEnv.loadEnvConfig(process.cwd());
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
assert.ok(new URL(base).hostname === 'localhost', 'Run this account-writing check against local development only.');
const email = `delivered+bpm-signup-${randomUUID()}@resend.dev`;
const password = '7';
const resend = new Resend(process.env.RESEND_API_KEY);
const api = await request.newContext({ baseURL: base });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
const errors = [], checks = [];
const output = 'artifacts/email-auth';
await mkdir(output, { recursive: true });
const post = (path, body, origin = base) => api.post(path, { data: body, headers: { Origin: origin } });
let store;
try {
  const denied = await api.post('/api/account/code', { data: { email } });
  assert.equal(denied.status(), 403);
  assert.equal((await post('/api/account/code', { email }, 'https://attacker.example')).status(), 403);
  assert.equal((await post('/api/account/code', { email: 'invalid' })).status(), 400);
  assert.equal((await post('/api/account/code', { email, extra: 'x'.repeat(5000) })).status(), 413);
  const noCsrf = await api.post('/api/auth/callback/credentials', { form: { email, password, json: 'true' } });
  assert.ok(noCsrf.status() < 500);
  assert.deepEqual(await (await api.get('/api/auth/session')).json(), {});
  checks.push('Origin, JSON input/size validation and NextAuth credential CSRF protection');

  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/login?callbackUrl=%2Fpricing`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address', { exact: true }).fill(email);
  for (const mode of ['login', 'register']) {
    if (mode === 'register') await page.getByRole('button', { name: 'Create account', exact: true }).first().click();
    for (const width of [1440, 768, 390, 375]) {
      await page.setViewportSize({ width, height: 1100 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${mode} overflow at ${width}`);
      if ([1440, 390].includes(width)) await page.screenshot({ path: `${output}/${mode}-${width}.png`, fullPage: true });
    }
  }
  await page.setViewportSize({ width: 1440, height: 1100 });
  const sending = page.waitForResponse(response => response.url().endsWith('/api/account/code') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Send code', exact: true }).click();
  const sent = await sending;
  assert.equal(sent.status(), 200, 'Verification send must succeed.');
  const sentBody = await sent.json();
  assert.ok(!Object.hasOwn(sentBody, 'code'), 'API must not return the code.');
  assert.ok(await page.getByRole('button', { name: /Resend in/ }).isDisabled());
  const tooSoon = await post('/api/account/code', { email });
  assert.equal(tooSoon.status(), 429); assert.ok(Number(tooSoon.headers()['retry-after']) > 0);

  let mailId;
  for (let attempt = 0; attempt < 5 && !mailId; attempt++) {
    const listing = await resend.emails.list();
    assert.ok(!listing.error, 'Reading official test inbox requires a full-access Resend key.');
    mailId = listing.data.data.find(mail => mail.to?.includes(email))?.id;
    if (!mailId) await new Promise(resolve => setTimeout(resolve, 1500));
  }
  assert.ok(mailId, 'Test message should appear in Resend.');
  // Only the official Resend test recipient generated above is read. Never print its code.
  const delivery = await resend.emails.get(mailId);
  assert.ok(!delivery.error && delivery.data.to.includes(email));
  assert.ok(delivery.data.from.includes('support@bpmfder.com'));
  const code = delivery.data.text.match(/code is (\d{6})\./)?.[1];
  assert.ok(code, 'The verification template should contain a six-digit code.');
  checks.push('Real Resend send from support@bpmfder.com to official delivered+label test inbox; cooldown and no code in API response');

  const wrongCode = `${(Number(code[0]) + 1) % 10}${code.slice(1)}`;
  assert.equal((await post('/api/account/register', { email, code: wrongCode, password })).status(), 400);
  assert.equal((await post('/api/account/register', { email, code, password: '' })).status(), 400);
  await page.getByLabel('Verification code', { exact: true }).fill(code);
  await page.getByLabel('Create a password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Show password', exact: true }).click();
  assert.equal(await page.getByLabel('Create a password', { exact: true }).getAttribute('type'), 'text');
  await page.getByRole('button', { name: 'Hide password', exact: true }).click();
  await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await page.waitForURL(`${base}/pricing`, { timeout: 30000 });
  const session = await (await context.request.get(`${base}/api/auth/session`)).json();
  assert.ok(session.user.email === email, 'New registration should authenticate the verified email.');
  assert.equal(session.password, undefined); assert.equal(session.user.password, undefined); assert.equal(session.user.password_hash, undefined);
  assert.equal((await post('/api/account/register', { email, code, password })).status(), 400);
  store = new AccountStore(resolve(process.env.AUTH_DATABASE_PATH || '.data/accounts.sqlite'));
  const account = store.account(email);
  assert.ok(account); assert.match(account.password_hash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/);
  assert.ok(await verifyPassword(password, account.password_hash));
  assert.equal(store.db.prepare('SELECT id FROM registration_codes WHERE email=?').get(email), undefined);
  checks.push('Wrong code/empty password rejected; single-character password registration creates durable salted password hash, auto signs in, and consumes code exactly once');

  await page.getByRole('button', { name: 'Your account', exact: true }).click();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.getByRole('link', { name: 'Sign in', exact: true }).waitFor();
  await page.goto(`${base}/login?callbackUrl=%2Fpricing`, { waitUntil: 'networkidle' });
  await page.getByLabel('Email address', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('incorrect passphrase');
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: /Email or password/ }).waitFor();
  assert.deepEqual(await (await context.request.get(`${base}/api/auth/session`)).json(), {});
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in with email', exact: true }).click();
  await page.waitForURL(`${base}/pricing`, { timeout: 30000 });
  const loginSession = await (await context.request.get(`${base}/api/auth/session`)).json();
  assert.ok(loginSession.user.email === email);
  assert.deepEqual(errors, []);
  checks.push('Real email/password login after logout, incorrect password rejection, safe session, callback navigation, desktop/mobile forms and password visibility');
  await writeFile(`${output}/report.json`, JSON.stringify({ checks, errors, recipient: 'Official Resend delivered test inbox', liveEmailsSent: 1 }, null, 2));
  console.log(JSON.stringify({ checks, errors, liveEmailsSent: 1 }, null, 2));
} finally {
  // Remove only this run’s generated test identity; leave real accounts and protective source limits intact.
  store ??= new AccountStore(resolve(process.env.AUTH_DATABASE_PATH || '.data/accounts.sqlite'));
  store.db.prepare('DELETE FROM accounts WHERE email=?').run(email);
  store.db.prepare('DELETE FROM registration_codes WHERE email=?').run(email);
  store.close();
  await context.close(); await browser.close(); await api.dispose();
}
