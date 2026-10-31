import { chromium, request } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import nextEnv from '@next/env';
import { encode } from 'next-auth/jwt';

nextEnv.loadEnvConfig(process.cwd());
const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const secret = process.env.NEXTAUTH_SECRET;
const privateKey = process.env.WAFFO_PRIVATE_KEY || '';
const credentials = [process.env.GOOGLE_CLIENT_SECRET, process.env.RESEND_API_KEY, secret, privateKey,
  privateKey.split(/\\n|\r?\n/).find(line => line.length > 40 && !line.includes('PRIVATE KEY'))].filter(Boolean);
assert.ok(secret, 'A local session secret is required for the isolated session fixture.');
const errors = [], checks = [];
const api = await request.newContext({ baseURL: base });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const output = 'artifacts/auth';
await mkdir(output, { recursive: true });

try {
  assert.deepEqual(await (await api.get('/api/auth/session')).json(), {});
  const providers = await (await api.get('/api/auth/providers')).json();
  assert.deepEqual(Object.keys(providers).sort(), ['credentials', 'google']);
  assert.equal(providers.google.callbackUrl, `${base}/api/auth/callback/google`);
  const withoutCsrf = await api.post('/api/auth/signin/google', { form: { json: 'true', callbackUrl: '/' } });
  assert.notEqual(new URL((await withoutCsrf.json()).url).origin, 'https://accounts.google.com');
  const csrf = await (await api.get('/api/auth/csrf')).json();
  const signin = await api.post('/api/auth/signin/google', { form: { csrfToken: csrf.csrfToken, callbackUrl: '/pricing', json: 'true' } });
  const authUrl = new URL((await signin.json()).url);
  assert.equal(authUrl.origin, 'https://accounts.google.com');
  assert.equal(authUrl.searchParams.get('redirect_uri'), `${base}/api/auth/callback/google`);
  assert.equal(authUrl.searchParams.get('client_id'), process.env.GOOGLE_CLIENT_ID);
  assert.equal(authUrl.searchParams.get('scope'), 'openid email profile');
  assert.equal(authUrl.searchParams.get('response_type'), 'code');
  assert.equal(authUrl.searchParams.get('code_challenge_method'), 'S256');
  for (const name of ['code_challenge', 'state', 'nonce']) assert.ok(authUrl.searchParams.get(name));
  const cookies = (await api.storageState()).cookies;
  for (const part of ['state', 'nonce', 'pkce.code_verifier']) {
    const cookie = cookies.find(cookie => cookie.name === `next-auth.${part}`);
    assert.ok(cookie?.httpOnly && cookie.sameSite === 'Lax');
  }
  const invalid = await api.get('/api/auth/callback/google?code=invalid&state=incorrect', { maxRedirects: 0 });
  assert.match(invalid.headers().location, /error=/);
  assert.deepEqual(await (await api.get('/api/auth/session')).json(), {});
  const denied = await api.get('/api/auth/callback/google?error=access_denied', { maxRedirects: 0 });
  assert.match(denied.headers().location, /error=(AccessDenied|Callback)/);
  checks.push('Real Google discovery/authorization URL, exact callback, limited scopes, CSRF, PKCE/state/nonce cookies and invalid callback rejection');

  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && errors.length < 5) errors.push(message.text()); });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  assert.deepEqual(errors, []);
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${base}/login**`);
  await page.getByRole('heading', { name: 'Welcome to BPM Finder.', exact: true }).waitFor();
  for (const width of [1440, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 950 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Login overflow at ${width}`);
    assert.ok(await page.getByRole('button', { name: 'Continue with Google', exact: true }).isVisible());
    if (width === 1440 || width === 390) await page.screenshot({ path: `${output}/login-${width}.png`, fullPage: true });
  }
  await page.goto(`${base}/login?error=OAuthCallback&callbackUrl=https://example.com`, { waitUntil: 'networkidle' });
  assert.match(await page.locator('.login-error[role="alert"]').innerText(), /try again/);
  assert.equal(await page.getByRole('link', { name: 'Continue without signing in' }).getAttribute('href'), '/');
  let browserAuthUrl;
  await page.route('https://accounts.google.com/**', async route => { browserAuthUrl = route.request().url(); await route.fulfill({ contentType: 'text/html', body: '<p>Google authorization handoff verified.</p>' }); });
  await page.getByRole('button', { name: 'Continue with Google', exact: true }).click();
  await page.waitForURL('https://accounts.google.com/**');
  assert.equal(new URL(browserAuthUrl).searchParams.get('redirect_uri'), `${base}/api/auth/callback/google`);
  await page.close();
  checks.push('127.0.0.1 to localhost login canonicalization, desktop/mobile login, safe error/retry and UI-to-Google handoff');

  // A locally encrypted synthetic session tests session reading and sign-out only.
  // It is not evidence of a successful Google account authorization.
  const token = await encode({ token: { sub: 'isolated-test-user', name: 'Studio Listener', email: 'listener@example.test' }, secret, maxAge: 3600 });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
  const signed = await context.newPage();
  signed.on('pageerror', error => errors.push(error.message));
  const session = await (await context.request.get(`${base}/api/auth/session`)).json();
  assert.equal(session.user.name, 'Studio Listener');
  assert.equal(session.user.email, 'listener@example.test');
  assert.equal(session.accessToken, undefined);
  assert.equal(session.refreshToken, undefined);
  const csrflessSignout = await context.request.post(`${base}/api/auth/signout`, { form: { json: 'true' } });
  assert.ok(csrflessSignout.status() < 500);
  assert.equal((await (await context.request.get(`${base}/api/auth/session`)).json()).user.name, 'Studio Listener');
  for (const route of ['/', '/pricing', '/blogs']) {
    await signed.goto(base + route, { waitUntil: 'networkidle' });
    for (const width of [1440, 390, 375]) {
      await signed.setViewportSize({ width, height: 950 });
      const account = signed.getByRole('button', { name: 'Your account', exact: true });
      await account.click();
      assert.equal(await signed.locator('#account-panel>span').textContent(), 'listener@example.test');
      assert.ok(await signed.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Account overflow on ${route} at ${width}`);
      const bounds = await signed.locator('#account-panel').boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `${route} ${width}px account bounds: ${JSON.stringify(bounds)}`);
      if (route === '/' && width !== 375) await signed.screenshot({ path: `${output}/account-${width}.png` });
      await account.press('Escape');
      assert.equal(await signed.locator('#account-panel').count(), 0);
    }
  }
  await signed.goto(`${base}/login?callbackUrl=%2Fpricing`);
  await signed.waitForURL(`${base}/pricing`);
  await signed.getByRole('button', { name: 'Your account', exact: true }).click();
  await signed.getByRole('button', { name: 'Sign out', exact: true }).click();
  await signed.getByRole('link', { name: 'Sign in', exact: true }).waitFor();
  assert.deepEqual(await (await context.request.get(`${base}/api/auth/session`)).json(), {});
  await context.close();
  checks.push('Encrypted synthetic session: name/email only, header account UI on all pages, menu dismissal, login return, CSRF-protected sign-out');

  const publicPaths = ['/', '/login', '/pricing', '/api/auth/providers', '/api/auth/session', '/.env.local'];
  for (const path of publicPaths) {
    const response = await api.get(path);
    const body = await response.text();
    for (const credential of credentials) assert.ok(!body.includes(credential), `Credential exposure at ${path}`);
    if (path === '/.env.local') assert.equal(response.status(), 404);
  }
  async function scan(dir) {
    for (const file of await readdir(dir, { withFileTypes: true })) {
      const path = `${dir}/${file.name}`;
      if (file.isDirectory()) await scan(path);
      else if (/\.(js|json|html|map)$/.test(file.name)) {
        const text = await readFile(path, 'utf8');
        for (const credential of credentials) assert.ok(!text.includes(credential), `Credential bundled in ${path}`);
      }
    }
  }
  await scan('.next/static');
  checks.push('No client/session secret in public responses, environment URL or production browser bundles');
  assert.deepEqual(errors, []);
  const report = { checks, errors, realGoogleAccountAuthorization: 'Not completed; requires the user to sign in and consent in their browser.' };
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await api.dispose(); await browser.close(); }
