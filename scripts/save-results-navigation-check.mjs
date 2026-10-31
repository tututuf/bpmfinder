import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = new URL(process.env.BASE_URL || 'http://127.0.0.1:3000');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { checks: [], documentRequests: [], errors: [] };
try {
  for (const host of ['127.0.0.1', 'localhost']) for (const width of [390, 1440]) {
    const url = new URL(base); url.hostname = host;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(url.origin, { waitUntil: 'networkidle' });
    await page.evaluate(() => { window.__saveNavigationMarker = 'same-document'; });
    page.on('request', request => { if (request.resourceType() === 'document' && request.frame() === page.mainFrame()) report.documentRequests.push(request.url()); });
    const checkbox = page.getByRole('checkbox', { name: 'Save Results', exact: true });
    await checkbox.click(); await page.waitForURL(url.origin + '/pricing');
    assert.equal(await page.evaluate(() => window.__saveNavigationMarker), 'same-document');
    assert.deepEqual(report.documentRequests, []);
    await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click();
    await checkbox.waitFor(); assert.equal(await checkbox.isChecked(), false);
    assert.equal(await page.evaluate(() => window.__saveNavigationMarker), 'same-document');
    report.checks.push(`${host}:${url.port} ${width}px: guest Save Results opens Pricing without a document request or host change; returning keeps checkbox off`);
    await context.close();
  }
  assert.deepEqual(report.errors, []); assert.deepEqual(report.documentRequests, []);
  await mkdir('artifacts/save-results-navigation', { recursive: true });
  await writeFile('artifacts/save-results-navigation/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
