import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { ANALYSIS_VERSION } from '../public/advanced-analysis.mjs';
import { uploadFixtureTracks } from './browser-helpers.mjs';

const output = new URL('../artifacts/custom-select/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const fixtureTracks = [
  { name: 'Gamma', bpm: 120, key: 'Undetermined', camelot: '—', keyConfidence: 'unavailable' },
  { name: 'Alpha', bpm: 140, key: 'C major', camelot: '8B', keyConfidence: 'consistent' },
  { name: 'Beta', bpm: 90, key: 'D minor', camelot: '7A', keyConfidence: 'low' },
].map(track => ({ ...track, duration: 32, status: 'ready', waveform: [], analysisVersion: ANALYSIS_VERSION }));
page.on('pageerror', error => errors.push(error.message));
const filter = page.getByRole('combobox', { name: 'Filter by key status', exact: true });
const sort = page.getByRole('combobox', { name: 'Sort tracks', exact: true });
const rows = () => page.locator('tbody .track-detail-link').allTextContents();
const pick = async (control, label) => {
  await control.click();
  await page.getByRole('option', { name: label, exact: true }).click();
};
const active = async control => {
  const id = await control.getAttribute('aria-activedescendant');
  return page.locator(`[id="${id}"]`).getAttribute('aria-label');
};
async function bounds() {
  assert.equal(await page.getByRole('listbox').count(), 1);
  const box = await page.locator('.custom-select-menu').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width + 1 && box.y + box.height <= viewport.height + 1, JSON.stringify(box));
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
}

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await uploadFixtureTracks(page, fixtureTracks);
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; });
  assert.equal(await page.locator('select').count(), 0, 'All native selects are replaced');
  assert.equal(await page.getByRole('combobox').count(), 2);
  assert.deepEqual(await rows(), ['Gamma', 'Alpha', 'Beta']);
  await pick(filter, 'Key identified');
  assert.deepEqual(await rows(), ['Alpha', 'Beta']);
  await pick(filter, 'No key detected');
  assert.deepEqual(await rows(), ['Gamma']);
  await filter.click();
  assert.equal(await page.getByRole('option', { selected: true }).getAttribute('aria-label'), 'No key detected');
  await sort.click();
  assert.equal(await filter.getAttribute('aria-expanded'), 'false', 'Opening another select dismisses the first');
  assert.equal(await page.getByRole('listbox').count(), 1);
  await sort.press('Escape');
  await pick(filter, 'All keys');
  await pick(sort, 'BPM: low to high');
  assert.deepEqual(await rows(), ['Beta', 'Gamma', 'Alpha']);
  await pick(sort, 'BPM: high to low');
  assert.deepEqual(await rows(), ['Alpha', 'Gamma', 'Beta']);
  await pick(sort, 'Track name');
  assert.deepEqual(await rows(), ['Alpha', 'Beta', 'Gamma']);
  await pick(sort, 'Camelot');
  const order = await rows();
  assert.ok(order.indexOf('Beta') < order.indexOf('Alpha'));
  await pick(sort, 'Order added');
  assert.deepEqual(await rows(), ['Gamma', 'Alpha', 'Beta']);
  await sort.press('End');
  assert.equal(await active(sort), 'Camelot');
  await sort.press('Home');
  await sort.press('ArrowDown');
  await sort.press('Enter');
  assert.deepEqual(await rows(), ['Beta', 'Gamma', 'Alpha']);
  await sort.press('t');
  assert.equal(await active(sort), 'Track name');
  await sort.press('Escape');
  assert.equal(await sort.textContent(), 'BPM: low to high', 'Escape preserves the selected value');
  await sort.click();
  await sort.press('Shift+Tab');
  assert.equal(await page.getByRole('listbox').count(), 0);
  assert.equal(await filter.evaluate(element => element === document.activeElement), true);
  await filter.click();
  await page.getByRole('heading', { name: /Your tracks/ }).click();
  assert.equal(await page.getByRole('listbox').count(), 0);
  for (const width of [375, 390, 640, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    for (const control of [filter, sort]) {
      await control.click();
      await bounds();
      if (width === 390 || width === 1440) {
        const name = control === sort ? 'sort' : 'filter';
        await page.waitForTimeout(180);
        await page.screenshot({ path: fileURLToPath(new URL(`${name}-${width}.png`, output)) });
      }
      await control.press('Escape');
    }
  }
  // Opening near the lower edge must keep every menu item inside the viewport.
  await page.evaluate(() => {
    const rect = document.querySelector('.result-filters').getBoundingClientRect();
    window.scrollBy(0, rect.top - innerHeight + 80);
  });
  await sort.click();
  await bounds();
  assert.ok((await page.locator('.custom-select-menu').boundingBox()).y < (await sort.boundingBox()).y);
  await page.evaluate(() => window.scrollBy(0, 80));
  await page.waitForTimeout(100);
  await bounds();
  await sort.press('Escape');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobile.on('pageerror', error => errors.push(error.message));
  await mobile.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await uploadFixtureTracks(mobile, fixtureTracks);
  await mobile.getByRole('combobox', { name: 'Sort tracks', exact: true }).tap();
  await mobile.getByRole('option', { name: 'BPM: high to low', exact: true }).tap();
  assert.deepEqual(await mobile.locator('tbody .bpm-value').allTextContents(), ['140', '120', '90']);
  await mobile.getByRole('combobox', { name: 'Filter by key status', exact: true }).tap();
  await mobile.getByRole('option', { name: 'No key detected', exact: true }).tap();
  assert.equal(await mobile.locator('tbody tr').count(), 1);
  await mobile.getByRole('searchbox', { name: 'Search tracks', exact: true }).fill('missing track');
  assert.equal(await mobile.locator('tbody tr').count(), 0);
  await mobile.getByRole('button', { name: 'Clear filters', exact: true }).tap();
  assert.equal(await mobile.getByRole('combobox', { name: 'Filter by key status', exact: true }).textContent(), 'All keys');
  await mobile.close();
  assert.deepEqual(errors, []);
  const report = { checks: ['no native selects', 'all key status filters', 'all sort options', 'only one menu open', 'keyboard and focus', 'outside/Escape dismissal', '375/390/640/768/1440 layouts', 'upward placement and page scroll', 'mobile touch and clear filters'], errors };
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
