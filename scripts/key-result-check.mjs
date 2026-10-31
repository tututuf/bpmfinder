import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { captureAnalysis, readResults, uploadFixtureTracks } from './browser-helpers.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await mkdir('artifacts/key-results', { recursive: true });
  await captureAnalysis(page);
  await page.goto(base, { waitUntil: 'networkidle' });
  if (await page.getByRole('checkbox', { name: /Include danceability/ }).count()) await page.getByRole('checkbox', { name: /Include danceability/ }).uncheck();
  await page.locator('input[type=file]').setInputFiles('C:/Users/qq242/Downloads/beansandsausages-drum-loop-120-bpm-rock-funk-groove-553903.mp3');
  await page.locator('tbody .bpm-value').waitFor({ timeout: 120000 });
  const result = (await readResults(page))[0];
  assert.equal(result.bpm, 120);
  assert.equal(result.key, 'D major');
  assert.equal(result.camelot, '10B');
  assert.equal(result.keyCandidates.length, 3);
  assert.equal(result.analysisVersion, 'commercial-clap-2');
  assert.equal(await page.locator('tbody .key-badge').textContent(), result.key);
  assert.equal(await page.locator('tbody .camelot-badge').textContent(), result.camelot);
  assert.doesNotMatch(await page.locator('tbody').innerText(), /low.confidence|needs review/i);
  await page.locator('.results').screenshot({ path: 'artifacts/key-results/drum-results.png' });
  const name = await page.locator('tbody .track-detail-link').textContent();
  await page.getByRole('button', { name: `View analysis of ${name}`, exact: true }).click();
  const modal = page.getByRole('dialog');
  assert.equal(await modal.locator('.camelot-preview strong').textContent(), '10B');
  assert.equal(await modal.locator('.candidate-list button').count(), 3);
  await page.getByRole('button', { name: 'B minor 10A', exact: false }).click();
  assert.equal(await modal.locator('.camelot-preview strong').textContent(), '10A');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal(await page.locator('tbody .key-badge').textContent(), 'B minor');
  assert.equal(await page.locator('tbody .camelot-badge').textContent(), '10A');
  await page.getByRole('button', { name: `View analysis of ${name}`, exact: true }).click();
  await page.getByRole('button', { name: 'Restore estimates', exact: true }).click();
  assert.equal(await modal.locator('.camelot-preview strong').textContent(), '10B');
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    assert.ok(await modal.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
    await page.screenshot({ path: `artifacts/key-results/drum-inspector-${width}.png` });
  }
  await page.getByRole('button', { name: 'Close track details', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await download).saveAs('artifacts/key-results/drum.csv');
  assert.match(await readFile('artifacts/key-results/drum.csv', 'utf8'), /"120","D major","10B"/);

  // No stored results: reload for independent malformed/missing-field fixtures.
  await page.reload({ waitUntil: 'networkidle' });
  await uploadFixtureTracks(page, [
    { name: 'Missing Camelot', key: 'Db major', camelot: '', duration: 24, bpm: 124, waveform: [], status: 'ready' },
    { name: 'Unavailable key', key: '', camelot: '', duration: 24, bpm: 124, waveform: [], status: 'ready' },
  ]);
  const alias = page.locator('tbody tr').filter({ hasText: 'Missing Camelot' });
  assert.equal(await alias.locator('.key-badge').textContent(), 'C♯ major');
  assert.equal(await alias.locator('.camelot-badge').textContent(), '3B');
  const unknown = page.locator('tbody tr').filter({ hasText: 'Unavailable key' });
  assert.equal(await unknown.locator('.key-badge').textContent(), 'Not detected');
  assert.equal(await unknown.locator('.camelot-badge').textContent(), 'N/A');
  assert.deepEqual(errors, []);
  const { waveform, ...track } = result;
  const report = { track, checks: ['supplied MP3 real DSP: 120 BPM / D major / 10B', 'three real ranked alternatives', 'candidate edit and restore update Camelot', 'desktop/mobile inspector bounds', 'CSV key/Camelot pair', 'alias and missing Camelot normalization', 'explicit unavailable labels without empty cells'], errors };
  await writeFile('artifacts/key-results/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
