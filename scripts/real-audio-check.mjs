import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ANALYSIS_VERSION } from '../public/advanced-analysis.mjs';
import { captureAnalysis, readResults } from './browser-helpers.mjs';

const filename = process.argv[2];
if (!filename) throw new Error('Usage: node scripts/real-audio-check.mjs <supplied 120 BPM drum loop>');
const bytes = await readFile(filename);
assert.equal(createHash('sha256').update(bytes).digest('hex'), '34d58ee7a0874d5786a105c044f5a72cd251042ad6053079286ed8744880cf97', 'This regression is specific to the supplied reference recording.');
const output = new URL('../artifacts/audio-diagnosis/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, acceptDownloads: true });
const errors = [], uploads = [];
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => { if (r.method() === 'POST' && !r.url().includes('__nextjs')) uploads.push(r.url()); });
const originalName = path.basename(filename).replace(/\.[^.]+$/, '');
const ready = () => page.waitForFunction(() => document.querySelectorAll('tbody .bpm-value').length === 1, null, { timeout: 120000 });
try {
  await captureAnalysis(page);
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.evaluate(name => localStorage.setItem('bpmfinder-results', JSON.stringify([
    { id: 'legacy', name, duration: 32.04, bpm: 60, key: 'A minor', camelot: '8A', color: 'blue', waveform: [], status: 'ready' },
    { id: 'other', name: 'Retained history', duration: 10, bpm: 90, key: 'C major', camelot: '8B', color: 'blue', waveform: [], status: 'ready' },
  ])), originalName);
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('tbody tr').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('bpmfinder-results')), null);
  await page.locator('input[type=file]').setInputFiles(filename);
  await ready();
  const reference = page.locator('tbody tr').filter({ hasText: originalName });
  assert.equal(await reference.count(), 1);
  assert.equal(await reference.locator('.bpm-value').textContent(), '120');
  assert.equal(await reference.locator('.key-badge').textContent(), 'D minor');
  assert.equal(await reference.locator('.camelot-badge').textContent(), '7A');
  assert.equal(await reference.locator('.key-estimate-note').textContent(), 'Low confidence');
  assert.match(await reference.locator('.key-badge').getAttribute('title'), /evidence disagree/);
  await page.getByRole('combobox', { name: 'Filter by key status', exact: true }).click();
  await page.getByRole('option', { name: 'Needs review', exact: true }).click();
  assert.equal(await page.locator('tbody tr').count(), 1);
  assert.equal(await reference.count(), 1);
  await page.getByRole('combobox', { name: 'Filter by key status', exact: true }).click();
  await page.getByRole('option', { name: 'Key identified', exact: true }).click();
  assert.equal(await reference.count(), 0);
  await page.getByRole('combobox', { name: 'Filter by key status', exact: true }).click();
  await page.getByRole('option', { name: 'All keys', exact: true }).click();
  assert.equal(await page.locator('tbody tr').filter({ hasText: 'Retained history' }).count(), 0);
  await page.getByRole('button', { name: `View analysis of ${originalName}`, exact: true }).click();
  await page.getByText('Low-confidence estimate', { exact: true }).waitFor();
  if (await page.getByRole('button', { name: 'Dismiss notification' }).isVisible()) await page.getByRole('button', { name: 'Dismiss notification' }).click();
  await page.screenshot({ path: fileURLToPath(new URL('upgraded-real-audio.png', output)) });
  await page.getByRole('button', { name: 'Close track details' }).click();
  const csvEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const csvDownload = await csvEvent;
  const csvFile = new URL('estimated-key.csv', output);
  await csvDownload.saveAs(fileURLToPath(csvFile));
  assert.match(await readFile(csvFile, 'utf8'), /"D minor","7A"/);
  assert.match(await readFile(csvFile, 'utf8'), /Low-confidence estimate/);
  await page.getByRole('button', { name: 'Clear all', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({ name: 'reference-audio.mp3', mimeType: 'audio/mpeg', buffer: bytes });
  await page.locator('tbody .bpm-value').waitFor({ timeout: 60000 });
  assert.equal(await page.locator('tbody .bpm-value').textContent(), '120');
  assert.equal(await page.locator('tbody .key-badge').textContent(), 'D minor');
  const saved = await readResults(page);
  assert.equal(saved[0].analysisVersion, ANALYSIS_VERSION);
  assert.equal(saved[0].keyConfidence, 'low');
  assert.equal(saved[0].analysisScope, 'full');
  await page.getByRole('button', { name: 'View analysis of reference-audio', exact: true }).click();
  await page.getByText('32.0 seconds · full audio analyzed', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Close track details' }).click();
  assert.equal(saved[0].keyObservations.length, 3);
  assert.ok(saved[0].keyObservations.every(o => o.start === 0 && o.duration === 32.04));
  assert.equal(saved[0].moodPatches, 11);
  assert.equal(saved[0].moodSeconds, 32.04);
  assert.equal(await page.evaluate(() => localStorage.getItem('bpmfinder-results')), null);
  assert.equal(await page.locator('tbody .key-badge').textContent(), 'D minor');
  await page.locator('tbody .key-estimate-note').waitFor();
  await page.getByRole('button', { name: 'View analysis of reference-audio', exact: true }).click();
  await page.getByRole('combobox', { name: 'Track key', exact: true }).click();
  await page.getByRole('option', { name: 'G minor', exact: true }).click();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal(await page.locator('tbody .key-estimate-note').count(), 0);
  await page.getByRole('button', { name: 'View analysis of reference-audio', exact: true }).click();
  await page.getByRole('button', { name: 'Restore estimates', exact: true }).click();
  assert.equal(await page.getByRole('combobox', { name: 'Track key', exact: true }).textContent(), 'D minor');
  await page.getByText('Low-confidence estimate', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close track details' }).click();
  for (const width of [375, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}px`);
    if (width === 390) {
      await page.locator('tbody .key-badge').scrollIntoViewIfNeeded();
      await page.screenshot({ path: fileURLToPath(new URL('real-audio-mobile.png', output)) });
    }
  }
  await page.reload({ waitUntil: 'networkidle' });
  assert.equal(await page.locator('tbody tr').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('bpmfinder-results')), null);
  assert.deepEqual(errors, []);
  assert.deepEqual(uploads, []);
  const report = { bpm: 120, key: 'D minor', camelot: '7A', analysisVersion: ANALYSIS_VERSION, analysis: (({ waveform, ...result }) => result)(saved[0]), checks: ['original file upload', 'legacy storage removed', 'identical bytes renamed', 'results not persisted; refresh clears', 'best candidate and low-confidence label', 'review filter', 'CSV estimate status', 'manual correction and reset', '375/390/768/1440px overflow', 'no audio uploads'], errors };
  await writeFile(new URL('regression.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
