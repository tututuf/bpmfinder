import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

await mkdir('artifacts/article-toc', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const report = { checks: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:3000') + '/blogs/how-to-find-key-of-a-song', { waitUntil: 'networkidle' });
  const side = page.getByRole('navigation', { name: 'Sticky article contents', exact: true });
  const inline = page.getByRole('navigation', { name: 'Article contents', exact: true });
  await page.waitForFunction(() => !!document.querySelector('.article-sidebar-contents'));
  assert.equal(await side.isVisible(), false);
  const before = await page.locator('.article-body').boundingBox();
  await inline.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  assert.equal(await side.isVisible(), false, 'No sidebar while the inline contents remain onscreen');
  await page.locator('#find-by-ear').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await side.waitFor();
  await page.waitForFunction(() => document.querySelector('.article-sidebar-contents a[aria-current="location"]')?.getAttribute('href') === '#find-by-ear');
  const after = await page.locator('.article-body').boundingBox();
  assert.equal(before.x, after.x);
  assert.equal(before.width, after.width, 'Mounting the sidebar never shifts article content');
  assert.equal(after.width, 800);
  assert.ok(Math.abs(after.x + after.width / 2 - 720) <= 1, 'Article stays centered independently of the sidebar');
  assert.ok(Math.abs((await side.boundingBox()).y - 32) <= 1);
  await page.screenshot({ path: 'artifacts/article-toc/desktop.png' });
  report.checks.push('Initially hidden; appears only after inline contents pass the top; stable article width and 32px sticky offset');
  const ids = ['analyze-audio', 'find-by-ear', 'check-chords', 'read-a-score', 'worked-example', 'check-the-result', 'sources'];
  for (const id of ids) {
    await side.locator(`a[href="#${id}"]`).click();
    await page.waitForURL(url => url.hash === `#${id}`);
    await page.waitForFunction(id => document.querySelector('.article-sidebar-contents a[aria-current="location"]')?.getAttribute('href') === `#${id}`, id);
    await page.waitForFunction(id => {
      const section = document.getElementById(id);
      const offset = parseFloat(getComputedStyle(section).scrollMarginTop) + parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop || '0');
      return Math.abs(section.getBoundingClientRect().top - offset) < 3;
    }, id, { timeout: 5000 });
  }
  report.checks.push('All seven chapter links navigate and track the current section, including sources');
  const keyboardLink = side.locator('a[href="#check-chords"]');
  await keyboardLink.focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(url => url.hash === '#check-chords');
  await page.waitForFunction(() => document.querySelector('.article-sidebar-contents a[aria-current="location"]')?.getAttribute('href') === '#check-chords');
  await page.goBack();
  await page.waitForURL(url => url.hash === '#sources');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await page.waitForTimeout(100);
  const limit = await page.locator('.article-reading-layout').boundingBox();
  const nav = await page.locator('.article-sidebar-contents').boundingBox();
  if (nav) assert.ok(nav.y + nav.height <= limit.y + limit.height + 1, 'Sidebar stays within article end');
  report.checks.push('Keyboard Enter, hash history/back and article-end containment');
  for (const width of [1920, 1440, 1200, 1199, 1024, 768, 390, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator('#worked-example').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
    await page.waitForTimeout(80);
    assert.equal(await side.isVisible(), width >= 1200, `Responsive side navigation at ${width}`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    const centered = await page.locator('.article-body').boundingBox();
    assert.ok(Math.abs(centered.x + centered.width / 2 - width / 2) <= 1, `Centered article at ${width}`);
    if (width >= 1200) {
      const body = await page.locator('.article-body').boundingBox(), nav = await side.boundingBox();
      assert.ok(body.x + body.width + 30 < nav.x, 'Readable gap between article and sidebar');
    }
  }
  await page.setViewportSize({ width: 1440, height: 420 });
  await page.locator('#worked-example').evaluate(el => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.waitForTimeout(80);
  const rail = await page.locator('[data-article-sidebar]').boundingBox();
  assert.ok(rail.y >= 31 && rail.y + rail.height <= 420 - 31, 'Short screens can scroll the sidebar internally');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('.article-sidebar-contents')?.hidden === true);
  report.checks.push('1920–375px overflow/overlap checks, desktop-to-mobile resize, short viewport and return-to-top hiding');
  const nojs = await browser.newPage({ javaScriptEnabled: false });
  await nojs.goto((process.env.BASE_URL || 'http://127.0.0.1:3000') + '/blogs/how-to-find-key-of-a-song');
  assert.equal(await nojs.getByRole('navigation', { name: 'Article contents', exact: true }).locator('a').count(), 7);
  report.checks.push('No-JavaScript visitors retain all seven inline anchor links');
  assert.deepEqual(report.errors, []);
  await writeFile('artifacts/article-toc/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
