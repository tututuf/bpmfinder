import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { uploadFixtureTracks } from './browser-helpers.mjs';

const output = new URL('../artifacts/key-select/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
const fixtureTracks = [{
  name: 'Key selector sample', duration: 32, bpm: 120,
  key: 'D minor', originalKey: 'D minor', camelot: '7A', originalCamelot: '7A',
  color: 'blue', waveform: [], status: 'ready', keyConfidence: 'low',
  keyStatus: 'Low-confidence estimate', keyNote: 'Low-confidence key; needs review.', keyAgreement: 33,
  keyCandidates: [{ key: 'D minor', camelot: '7A', votes: 1, strength: 0.5, segments: 1 }, { key: 'G major', camelot: '9B', votes: 1, strength: 0.4, segments: 1 }],
}];
page.on('pageerror', error => errors.push(error.message));
const combo = page.getByRole('combobox', { name: 'Track key', exact: true });
const menu = page.getByRole('listbox', { name: 'Musical key', exact: true });
const modal = page.getByRole('dialog');
const selected = () => menu.getByRole('option', { selected: true });
const active = () => combo.getAttribute('aria-activedescendant').then(id => page.locator(`[id="${id}"]`).getAttribute('aria-label'));
async function checkBounds() {
  const box = await page.locator('.custom-select-menu').boundingBox();
  const viewport = page.viewportSize();
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height, JSON.stringify(box));
  assert.ok(await modal.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
}

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await uploadFixtureTracks(page, fixtureTracks);
  assert.doesNotMatch(await page.locator('body').innerText(), /low.confidence|needs review|profile agreement/i);
  assert.equal(await page.locator('.key-badge').getAttribute('title'), null);
  const openDetails = () => page.getByRole('button', { name: 'View analysis of Key selector sample', exact: true }).click();
  await openDetails();
  assert.doesNotMatch(await modal.innerText(), /confidence|profile agreement|profile votes/i);
  if (await page.getByRole('button', { name: 'Dismiss notification' }).isVisible()) await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await combo.click();
  assert.equal(await menu.getByRole('option').count(), 25);
  assert.equal(await selected().getAttribute('aria-label'), 'D minor');
  await checkBounds();
  await page.waitForTimeout(200);
  await page.screenshot({ path: fileURLToPath(new URL('desktop.png', output)) });
  await menu.getByRole('option', { name: 'B major', exact: true }).click();
  assert.equal(await combo.textContent(), 'B major');
  assert.equal(await modal.locator('.camelot-preview strong').textContent(), '1B');
  assert.equal(await menu.count(), 0);
  assert.equal(await combo.evaluate(element => element === document.activeElement), true);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  assert.equal(await active(), 'B minor');
  await page.keyboard.press('Enter');
  assert.equal(await combo.textContent(), 'B minor');
  await page.keyboard.press('Space');
  await page.keyboard.press('Home');
  assert.equal(await active(), 'Undetermined');
  await page.keyboard.press('Enter');
  assert.equal(await modal.locator('.camelot-preview strong').textContent(), '—');
  await page.keyboard.press('End');
  assert.equal(await active(), 'B minor');
  await page.keyboard.press('Escape');
  assert.equal(await menu.count(), 0);
  assert.equal(await modal.count(), 1);
  assert.equal(await combo.textContent(), 'Undetermined', 'Escape discards the highlighted option');
  await page.keyboard.press('g');
  assert.equal(await active(), 'G major');
  await page.keyboard.press('Enter');
  assert.equal(await combo.textContent(), 'G major');
  await combo.click();
  await page.keyboard.press('Tab');
  assert.equal(await menu.count(), 0);
  assert.equal(await combo.evaluate(element => element === document.activeElement), false);
  await combo.click();
  await modal.locator('h2').click();
  assert.equal(await menu.count(), 0);

  await modal.getByRole('button', { name: /D minor.*7A/ }).click();
  assert.equal(await combo.textContent(), 'D minor');
  await combo.click();
  assert.equal(await selected().getAttribute('aria-label'), 'D minor', 'Candidate selection synchronizes the menu');
  await menu.getByRole('option', { name: 'G minor', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal(await page.locator('tbody .key-badge').textContent(), 'G minor');
  await openDetails();
  assert.equal(await combo.textContent(), 'G minor');
  await page.getByRole('button', { name: 'Restore estimates', exact: true }).click();
  assert.equal(await combo.textContent(), 'D minor');
  await combo.click();
  assert.equal(await selected().getAttribute('aria-label'), 'D minor');
  await page.keyboard.press('Escape');

  for (const width of [375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 850 });
    await combo.click();
    await checkBounds();
    await combo.press('End');
    assert.ok(await menu.getByRole('option', { name: 'B minor', exact: true }).evaluate(element => {
      const item = element.getBoundingClientRect(), list = element.parentElement.getBoundingClientRect();
      return item.top >= list.top - 1 && item.bottom <= list.bottom + 1;
    }), 'Keyboard navigation scrolls the final option into view');
    await combo.press('Home');
    await combo.press('ArrowDown');
    assert.equal(await active(), 'C major');
    if (width === 390) await page.screenshot({ path: fileURLToPath(new URL('mobile.png', output)) });
    await combo.press('Escape');
  }
  // A short viewport places the compact inspector's key field near the bottom.
  await page.setViewportSize({ width: 1440, height: 300 });
  await modal.evaluate(element => { element.scrollTop = 0; });
  await combo.click();
  await checkBounds();
  assert.ok((await page.locator('.custom-select-menu').boundingBox()).y < (await combo.boundingBox()).y);
  await modal.evaluate(element => { element.scrollTop += 30; });
  await page.waitForTimeout(100);
  await checkBounds();
  await combo.press('Escape');
  await combo.press('Escape');
  assert.equal(await modal.count(), 0);
  const mobile = await browser.newPage({ viewport: { width: 390, height: 850 }, isMobile: true, hasTouch: true });
  await mobile.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await uploadFixtureTracks(mobile, fixtureTracks);
  await mobile.getByRole('button', { name: /View analysis of/ }).first().tap();
  await mobile.getByRole('combobox', { name: 'Track key', exact: true }).tap();
  await mobile.getByRole('option', { name: 'C minor', exact: true }).tap();
  assert.equal(await mobile.getByRole('combobox', { name: 'Track key', exact: true }).textContent(), 'C minor');
  await mobile.close();
  assert.deepEqual(errors, []);
  const report = { checks: ['25 accessible options', 'pointer selection and Camelot', 'arrow/space/enter/home/end/typeahead', 'active option scrolling', 'Escape keeps modal open', 'Tab and outside dismissal', 'candidate synchronization', 'apply edits and reset', '375/390/768/1440 layouts', 'upward placement and modal scroll'], errors };
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
