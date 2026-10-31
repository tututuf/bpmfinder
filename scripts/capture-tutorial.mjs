import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { createDemo } from '../src/lib/demo.ts';

// Screenshots come from real interactions and the production analysis worker.
// Generated audio stays in this browser session; only the screenshots are public.
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
await mkdir('public/images/tutorial', { recursive: true });
await mkdir('artifacts/tutorial-capture', { recursive: true });
const report = { source: 'Real application UI; locally generated 24-second audio; no worker mocks or edited results', images: [], errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'html { scroll-behavior:auto !important; } *, *::before, *::after { transition:none !important; animation:none !important; }' });
  await page.evaluate(() => document.fonts.ready);
  const save = async (name, buffer) => {
    await writeFile(`artifacts/tutorial-capture/${name}.png`, buffer);
    const output = `public/images/tutorial/${name}.webp`;
    const result = await sharp(buffer).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 88, effort: 6 }).toFile(output);
    report.images.push({ file: output, width: result.width, height: result.height, bytes: result.size });
  };
  await save('select-audio', await page.locator('.workspace').screenshot());
  const generated = createDemo(0);
  await page.locator('input[type=file]').setInputFiles({ name: 'Studio groove.wav', mimeType: 'audio/wav', buffer: Buffer.from(await generated.arrayBuffer()) });
  await page.locator('tbody .bpm-value').waitFor({ timeout: 120000 });
  await page.locator('.spin').waitFor({ state: 'hidden' });
  const row = await page.locator('tbody tr').innerText();
  assert.match(row, /124/);
  assert.match(row, /A minor/);
  report.analysis = row;
  await save('read-results', await page.locator('.results').screenshot());
  await page.getByRole('button', { name: 'Options for Studio groove', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect & edit result', exact: true }).waitFor();
  // Include the expanded menu, which extends below the results section.
  await page.locator('.results').scrollIntoViewIfNeeded();
  await page.locator('.track-menu').scrollIntoViewIfNeeded();
  const clip = await page.evaluate(() => {
    const result = document.querySelector('.results').getBoundingClientRect();
    const menu = document.querySelector('.track-menu').getBoundingClientRect();
    return { x: result.x, y: result.y + scrollY, width: result.width, height: Math.max(result.bottom, menu.bottom) - result.y + 16 };
  });
  const fullScreen = await page.screenshot({ fullPage: true });
  const menuScreen = await sharp(fullScreen).extract({ left: Math.round(clip.x * 2), top: Math.round(clip.y * 2), width: Math.round(clip.width * 2), height: Math.round(clip.height * 2) }).png().toBuffer();
  await save('check-tempo', menuScreen);
  await page.getByRole('tab', { name: 'Tap tempo', exact: true }).click();
  for (let i = 0; i < 9; i++) {
    await page.getByRole('button', { name: 'Tap the beat' }).click();
    if (i < 8) await page.waitForTimeout(490);
  }
  await page.locator('#tab-tap').focus();
  await save('tap-tempo', await page.locator('.workspace').screenshot());
  assert.deepEqual(report.errors, []);
  await writeFile('artifacts/tutorial-capture/report.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
