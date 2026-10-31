import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:3000';
const report = { checks: [], errors: [] };
await mkdir('artifacts/hero-art', { recursive: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'no-preference' });
  page.on('pageerror', e => report.errors.push(e.stack));
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const disc = page.locator('.record-disc');
  const transform = () => disc.evaluate(el => el.style.transform);
  const changes = async expected => {
    const before = await transform();
    await page.waitForTimeout(450);
    assert.equal((await transform()) !== before, expected);
  };
  await changes(true);
  assert.equal(await page.locator('.hero-art button').count(), 0);
  assert.equal(await page.getByText('SIDE A / ON REPEAT', { exact: true }).count(), 0);
  report.checks.push('Vinyl rotates continuously with no visible playback control or caption');

  await page.mouse.move(1100, 200);
  await page.waitForTimeout(550);
  assert.ok(await page.locator('.record-sleeve').evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42 < -4));
  assert.notEqual(await page.locator('.hero-art-scene').evaluate(el => el.style.transform), '');
  await page.screenshot({ path: 'artifacts/hero-art/hover-1440.png' });
  await page.mouse.move(100, 500);
  await page.waitForTimeout(700);
  assert.ok(await page.locator('.record-sleeve').evaluate(el => Math.abs(new DOMMatrix(getComputedStyle(el).transform).m42) < 0.1));
  report.checks.push('Pointer tilt and sleeve lift return to rest without changing the intro transform');

  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
  await page.waitForTimeout(150);
  await changes(false);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(150);
  await changes(true);
  report.checks.push('Offscreen vinyl pauses and resumes when visible');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  assert.equal(await transform(), '');
  await changes(false);
  assert.equal(await page.getByRole('button', { name: 'Pause record animation', exact: true }).isVisible(), false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForTimeout(1500);
  await changes(true);
  report.checks.push('Live reduced-motion changes revert disc and pointer transforms and restore motion when allowed');

  for (const width of [1440, 1024, 768, 760, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    assert.equal(await page.locator('.hero-art').isVisible(), width > 760);
    if (width <= 760) {
      assert.equal(await transform(), '');
    }
    if ([1440, 1024, 390].includes(width)) await page.screenshot({ path: `artifacts/hero-art/home-${width}.png` });
  }
  report.checks.push('Artwork fits desktop/tablet; hidden mobile artwork runs no tween');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Blogs', exact: true }).click();
  await page.waitForURL('**/blogs');
  await page.getByRole('link', { name: 'BPM Finder home', exact: true }).click();
  await page.waitForURL(baseUrl + '/');
  await page.waitForTimeout(1500);
  await changes(true);
  report.checks.push('Client navigation cleans up artwork and restarts a single visible spin on return');
  assert.deepEqual(report.errors, []);
  await writeFile('artifacts/hero-art/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
