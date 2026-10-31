import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { captureAnalysis, readResults } from './browser-helpers.mjs';

const filename = process.argv[2];
if (!filename) throw new Error('Usage: node scripts/diagnose-audio.mjs <audio file>');
const input = await readFile(filename);
const outputDir = new URL('../artifacts/audio-diagnosis/', import.meta.url);
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
try {
  await captureAnalysis(page);
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles(filename);
  await page.locator('tbody .bpm-value').waitFor({ timeout: 60000 });
  const ui = await page.locator('tbody tr').innerText();
  const { waveform, ...uiResult } = (await readResults(page))[0];
  const report = await page.evaluate(async ({ base64 }) => {
    const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const ctx = new AudioContext();
    const decoded = await ctx.decodeAudioData(data.buffer);
    const { analyzeAudio } = await import('/audio-analysis.mjs');
    const results = [];
    const pcm = {};
    for (const rate of [11025, 22050, 44100]) {
      const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
      const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
      const samples = (await offline.startRendering()).getChannelData(0);
      const start = performance.now();
      const result = analyzeAudio(samples, rate);
      let min = Infinity, max = -Infinity, square = 0;
      for (const value of samples) { min = Math.min(min, value); max = Math.max(max, value); square += value * value; }
      results.push({ sampleRate: rate, length: samples.length, min, max, rms: Math.sqrt(square / samples.length), elapsedMs: performance.now() - start, ...result });
      if (rate === 11025 || rate === 44100) {
        const bytes = new Uint8Array(samples.buffer); let str = '';
        for (let i = 0; i < bytes.length; i += 8192) str += String.fromCharCode(...bytes.subarray(i, i + 8192));
        pcm[rate] = btoa(str);
      }
    }
    await ctx.close();
    return { duration: decoded.duration, sourceChannels: decoded.numberOfChannels, decodeRate: decoded.sampleRate, results, pcm };
  }, { base64: input.toString('base64') });
  for (const [rate, base64] of Object.entries(report.pcm)) await writeFile(new URL(`sample-${rate}.f32`, outputDir), Buffer.from(base64, 'base64'));
  delete report.pcm;
  const result = { file: path.basename(filename), bytes: input.length, sha256: createHash('sha256').update(input).digest('hex'), ui, uiResult, ...report };
  if (result.sha256 === '34d58ee7a0874d5786a105c044f5a72cd251042ad6053079286ed8744880cf97') {
    for (const entry of result.results) {
      assert.ok(Math.abs(entry.bpm - 120) <= 1, `Reference tempo failed at ${entry.sampleRate} Hz: ${entry.bpm}`);
      assert.notEqual(entry.key, 'Undetermined');
      assert.match(entry.camelot, /^(?:[1-9]|1[0-2])[AB]$/);
    }
  }
  await writeFile(new URL('report.json', outputDir), JSON.stringify(result, null, 2));
  await page.screenshot({ path: fileURLToPath(new URL('result.png', outputDir)), fullPage: false });
  console.log(JSON.stringify({ ...result, results: result.results.map(({ waveform, ...entry }) => entry) }, null, 2));
} finally { await browser.close(); }
