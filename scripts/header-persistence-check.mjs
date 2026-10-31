import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import env from '@next/env';
import { encode } from 'next-auth/jwt';

env.loadEnvConfig(process.cwd());
const base = process.env.BASE_URL || 'http://localhost:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { checks: [], errors: [], documentRequests: [] };
await mkdir('artifacts/header-persistence', { recursive: true });
try {
  for (const signedIn of [false, true]) for (const reducedMotion of ['no-preference', 'reduce']) for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion });
    if (signedIn) {
      const identity = `header-fixture-${randomUUID()}`;
      const token = await encode({ token: { sub: identity, billingIdentity: identity, name: 'Header fixture', email: 'header@example.test' }, secret: process.env.NEXTAUTH_SECRET, maxAge: 3600 });
      await context.addCookies([{ name: 'next-auth.session-token', value: token, url: base, httpOnly: true, sameSite: 'Lax' }]);
    }
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    const authSelector = signedIn ? '.auth-account' : '.auth-signin';
    await page.locator(authSelector).waitFor();
    await page.evaluate(authSelector => {
      const header = document.querySelector('.site-header');
      window.__headerCheck = { header, nodes: [header.querySelector('.brand'), header.querySelector('.nav'), header.querySelector(authSelector)], failures: [], running: true };
      const sample = () => {
        const state = window.__headerCheck;
        if (!state.running) return;
        if (document.querySelector('.site-header') !== state.header || state.nodes.some(node => !node.isConnected)) state.failures.push('Header or child replaced');
        for (const node of [state.header, ...state.nodes]) {
          const style = getComputedStyle(node);
          if (Number(style.opacity) < .999 || style.visibility === 'hidden' || style.transform !== 'none') state.failures.push('Header hidden or transformed during navigation');
        }
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    }, authSelector);
    page.on('request', request => { if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) report.documentRequests.push(request.url()); });
    const showNav = async () => {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      if (!await page.getByRole('navigation', { name: 'Main navigation' }).isVisible()) await page.getByRole('button', { name: 'Toggle navigation', exact: true }).click();
    };
    const check = async () => {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const state = await page.evaluate(() => ({ failures: [...new Set(window.__headerCheck.failures)], count: document.querySelectorAll('.site-header').length, width: innerWidth, scroll: document.documentElement.scrollWidth }));
      assert.deepEqual(state.failures, []);
      assert.equal(state.count, 1);
      assert.ok(state.scroll <= state.width, `Overflow: ${JSON.stringify(state)}`);
    };
    for (const [label, path] of [['Pricing', '/pricing'], ['Blogs', '/blogs'], ['Saved Results', '/saved-results']]) {
      await showNav();
      await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: label, exact: true }).click();
      await page.waitForURL(base + path);
      await page.locator('main h1').waitFor();
      assert.equal(await page.locator(`.site-header a[href="${path}"]`).getAttribute('aria-current'), 'page');
      if (width < 540) assert.equal(await page.getByRole('button', { name: 'Toggle navigation', exact: true }).getAttribute('aria-expanded'), 'false');
      await check();
    }
    await page.goBack(); await page.waitForURL(base + '/blogs'); await check();
    await page.goForward(); await page.waitForURL(base + '/saved-results'); await check();
    if (width < 540) {
      await showNav();
      await page.getByRole('button', { name: 'Toggle navigation', exact: true }).press('Escape');
      assert.equal(await page.getByRole('button', { name: 'Toggle navigation', exact: true }).getAttribute('aria-expanded'), 'false');
    }
    await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click();
    await page.waitForURL(base + '/'); await page.locator('.workspace').waitFor(); await check();
    await showNav(); await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blogs', exact: true }).click();
    await page.waitForURL(base + '/blogs');
    await page.getByRole('link', { name: 'Back to the audio tools', exact: true }).click();
    await page.waitForURL(base + '/#workspace'); await check();
    if (!signedIn) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.getByRole('link', { name: 'Sign in', exact: true }).click();
      await page.waitForURL('**/login?**'); await page.locator('.login-card').waitFor(); await check();
      await page.getByRole('link', { name: 'Continue without signing in', exact: true }).click();
      await page.waitForURL(base + '/'); await page.locator('.workspace').waitFor(); await check();
    }
    await page.evaluate(() => { window.__headerCheck.running = false; window.scrollTo({ top: 0, behavior: 'instant' }); });
    if (reducedMotion === 'reduce') await page.locator('.site-header').screenshot({ path: `artifacts/header-persistence/${signedIn ? 'signed' : 'guest'}-${width}.png` });
    report.checks.push(`${signedIn ? 'Signed-in' : 'Guest'}, ${reducedMotion}, ${width}px: same header/brand/nav/auth nodes; no hiding or transforms; active route, mobile close/Escape, back/forward, hash and homepage navigation${signedIn ? '' : ', login round trip'}`);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.documentRequests, []);
  await writeFile('artifacts/header-persistence/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
