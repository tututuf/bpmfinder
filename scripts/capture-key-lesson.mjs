import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('artifacts/key-lesson', { recursive: true });
const manifest = JSON.parse(await readFile('public/audio/key-lesson/manifest.json', 'utf8'));
const report = { checked: '2026-10-31', source: 'Original downloadable teaching WAVs analyzed through the normal browser upload and production worker; no mocked or edited results.', generator: manifest.generator, workerUrls: [], observations: [], errors: [] };
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 2, reducedMotion: 'reduce', acceptDownloads: true });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('worker', worker => report.workerUrls.push(new URL(worker.url()).pathname + new URL(worker.url()).search));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const save = async (name, locator) => {
    const buffer = await locator.screenshot();
    await writeFile(`artifacts/key-lesson/${name}.png`, buffer);
    return sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 90, effort: 6 }).toFile(`public/images/tutorial/${name}.webp`);
  };
  await save('select-audio', page.locator('#workspace'));
  // Capture the minor example alone so the walkthrough screenshot has one clear result.
  for (const id of ['a-minor', 'c-major']) {
    const example = manifest.examples.find(item => item.id === id);
    await page.locator('input[type=file]').setInputFiles(`public/audio/key-lesson/${example.filename}`);
    const row = page.locator('tbody tr').filter({ hasText: example.filename.replace('.wav', '') });
    await row.locator('.bpm-value').waitFor({ timeout: 120000 });
    const observed = { id, filename: example.filename, sha256: example.sha256, composedKey: example.intendedKey, observedKey: await row.locator('.key-badge').innerText(), observedCamelot: await row.locator('.camelot-badge').innerText(), observedBpm: await row.locator('.bpm-value').innerText(), row: await row.innerText() };
    report.observations.push(observed);
    if (id === 'a-minor') await save('key-lesson-results', page.locator('.results'));
  }
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  await (await download).saveAs('artifacts/key-lesson/results.csv');
  report.csv = await readFile('artifacts/key-lesson/results.csv', 'utf8');
  const verification = [
    'BPM Finder — original key lesson examples',
    `Checked: ${report.checked}`,
    `Source: ${report.source}`,
    `Worker: ${[...new Set(report.workerUrls)].join(', ')}`,
    '',
    'Composition: one chord per 2-second 4/4 bar at 120 BPM; four bars repeated twice.',
    `Encoding: ${manifest.encoding}; ${manifest.sampleRate} Hz; ${manifest.durationSeconds} seconds.`,
    `Tuning: ${manifest.tuning}.`,
    manifest.rights,
    '',
    ...report.observations.flatMap(observed => [
      `File: ${observed.filename}`,
      `Composed progression: ${manifest.examples.find(example => example.id === observed.id).names.join(' - ')} (repeated twice)`,
      `Intended tonal center: ${observed.composedKey}`,
      `Observed, unedited analyzer result: ${observed.observedKey}; ${observed.observedCamelot}; ${observed.observedBpm} BPM; 16 seconds.`,
      `SHA-256: ${observed.sha256}`, '',
    ]),
    'Reproduce: download the WAV linked in the guide, upload it through BPM Finder, and compare Key and Camelot before editing any result.',
    'These two clear synthesized examples are teaching material, not an accuracy benchmark for real-world songs or percussion. Future engine versions may produce different estimates.',
  ].join('\n');
  await writeFile('public/audio/key-lesson/verification.txt', verification + '\n');
  await writeFile('artifacts/key-lesson/analysis-report.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  assert.deepEqual(report.errors, []);
  for (const example of report.observations) {
    const composition = manifest.examples.find(item => item.id === example.id);
    assert.equal(example.observedKey, composition.intendedKey, 'Keep the article walkthrough aligned with actual output');
    assert.equal(example.observedCamelot, composition.camelot);
    assert.equal(example.observedBpm, '120');
  }
} finally { await browser.close(); }
