import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const report = { checks: [], errors: [] };
await mkdir('artifacts/lightbox', { recursive: true });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: width === 390 ? 'reduce' : 'no-preference', isMobile: width === 390, hasTouch: width === 390 });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.stack));
    const documents = [];
    await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
    page.on('request', request => { if (request.resourceType() === 'document') documents.push(request.url()); });
    const startUrl = page.url();
    const previews = page.locator('.tutorial-screenshot');
    assert.equal(await previews.count(), 4);
    const close = page.getByRole('button', { name: 'Close image preview', exact: true });
    for (let index = 0; index < 4; index++) {
      const trigger = previews.nth(index).locator(':scope > a');
      await trigger.scrollIntoViewIfNeeded();
      await page.waitForTimeout(650);
      const beforeScroll = await page.evaluate(() => scrollY);
      if (width === 390) await trigger.tap(); else await trigger.click();
      const dialog = page.getByRole('dialog');
      await dialog.waitFor();
      await dialog.locator('img').evaluate(img => img.decode());
      await page.waitForTimeout(350);
      assert.equal(await dialog.evaluate(el => el.matches(':modal')), true);
      assert.equal(await close.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(await page.locator('.screenshot-lightbox-panel').evaluate(el => Number(getComputedStyle(el).opacity)), 1);
      const box = await dialog.locator('img').boundingBox();
      assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= 900, JSON.stringify(box));
      assert.equal(context.pages().length, 1);
      assert.equal(page.url(), startUrl);
      if (index === 1) await page.screenshot({ path: `artifacts/lightbox/preview-${width}.png` });
      // Native modal keeps keyboard focus away from the underlying page.
      await close.press('Tab');
      await page.keyboard.press('Tab');
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
      if (index === 0) await page.keyboard.press('Escape');
      else if (index === 1) await close.click();
      else await dialog.click({ position: { x: 2, y: 2 } });
      await dialog.waitFor({ state: 'detached' });
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.ok(Math.abs((await page.evaluate(() => scrollY)) - beforeScroll) < 3);
    }
    const larger = previews.first().locator('figcaption a');
    await larger.click();
    await close.waitFor();
    await close.click();
    assert.equal(await larger.evaluate(el => el === document.activeElement), true);
    assert.deepEqual(documents, []);
    report.checks.push(`${width}px: all four images and View larger open a modal without a new tab or navigation; image fits viewport, Escape/button/backdrop close, focus and scroll restore`);
    await context.close();
  }
  assert.deepEqual(report.errors, []);
  await writeFile('artifacts/lightbox/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
