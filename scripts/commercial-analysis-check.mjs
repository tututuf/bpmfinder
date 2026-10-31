import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createDemo } from '../src/lib/demo.ts';
import { captureAnalysis, readResults } from './browser-helpers.mjs';

const base = process.env.BASE_URL || 'http://127.0.0.1:3000';
const legacy = process.argv.includes('--legacy');
const prefix = legacy ? '/api/analysis/legacy/' : '/';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 }, reducedMotion: 'reduce' });
const errors = [], requests = [], workerErrors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('worker', w => w.on('console', m => { if (m.type() === 'error') workerErrors.push(m.text()); }));
page.on('request', r => {
  const contentType = r.headers()['content-type'] || '';
  let performanceBeacon = false;
  if (r.method() === 'POST' && new URL(r.url()).origin === new URL(base).origin && new URL(r.url()).pathname === '/cdn-cgi/rum' && contentType.includes('application/json')) {
    try {
      const payload = JSON.parse(r.postData() || '');
      performanceBeacon = typeof payload.siteToken === 'string' && typeof payload.pageloadId === 'string' && !/audio|samples|waveform|base64/i.test(Object.keys(payload).join(' '));
    } catch {}
  }
  requests.push({ url: r.url(), method: r.method(), performanceBeacon });
});
async function run(buffer, premium = true) {
  return page.evaluate(async ({ bytes, prefix, premium, legacy }) => {
    const context = new AudioContext();
    try {
      const decoded = await context.decodeAudioData(Uint8Array.from(bytes).buffer);
      const resample = async rate => {
        const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
        const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination); source.start();
        return (await offline.startRendering()).getChannelData(0);
      };
      const [samples, tonal, mood] = await Promise.all([resample(11025), legacy ? resample(44100) : new Float32Array(), premium ? resample(legacy ? 16000 : 48000) : new Float32Array()]);
      window.__testWorker ||= new Worker(`${prefix}analysis-worker.mjs`, { type: 'module' });
      return await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('Worker check timed out')), 240000);
        window.__testWorker.onerror = e => { clearTimeout(timer); reject(Error(e.message)); };
        window.__testWorker.onmessage = e => {
          if (e.data.progress) return;
          clearTimeout(timer);
          if (e.data.error) reject(Error(e.data.error)); else resolve(e.data.result);
        };
        window.__testWorker.postMessage({ samples: samples.buffer, tonalSamples: tonal.buffer, moodSamples: mood.buffer, sampleRate: 11025, premium, extended: premium }, [samples.buffer, tonal.buffer, mood.buffer]);
      });
    } finally { await context.close(); }
  }, { bytes: Array.from(buffer), prefix, premium, legacy });
}
try {
  await captureAnalysis(page);
  await page.goto(base, { waitUntil: 'networkidle' });
  const developmentAccess = (await (await page.request.get(`${base}/api/billing/status`)).json()).hasPro === true;
  if (developmentAccess) await page.getByRole('checkbox', { name: /Include danceability/ }).uncheck();
  const recording = await readFile('C:/Users/qq242/Downloads/beansandsausages-drum-loop-120-bpm-rock-funk-groove-553903.mp3');
  await page.locator('input[type=file]').setInputFiles({ name: 'Real drum loop.mp3', mimeType: 'audio/mpeg', buffer: recording });
  await page.locator('tbody .bpm-value').waitFor({ timeout: 120000 });
  const free = (await readResults(page))[0];
  assert.ok(Math.abs(free.bpm - 120) <= 1);
  if (!developmentAccess) for (const field of ['energy', 'danceability', 'happiness', 'moodMethod']) assert.equal(field in free, false);
  if (!legacy) { assert.equal(free.key, 'D major'); assert.equal(free.camelot, '10B'); }
  assert.equal(requests.filter(r => r.url.includes('/models/')).length, 0);
  if (!legacy) for (const path of ['/models/musicnn/model.json', '/models/mood_happy/model.json', '/vendor/essentia-wasm.es.js', '/api/analysis/legacy/analysis-worker.mjs', '/api/analysis/legacy/vendor/tf.min.js']) assert.equal((await page.request.get(`${base}${path}`)).status(), 404);
  const started = Date.now();
  const first = await run(recording), second = await run(recording);
  for (const result of [first, second]) {
    for (const field of ['energy', 'danceability', 'happiness']) assert.ok(Number.isFinite(result[field]) && result[field] >= 0 && result[field] <= 100, `${field}: ${result[field]}`);
    assert.equal(result.analysisVersion, legacy ? 'essentia-5-estimate' : 'commercial-clap-2');
    assert.deepEqual(result.warnings, []);
  }
  assert.equal(first.danceability, second.danceability);
  assert.equal(first.happiness, second.happiness);
  const source = Buffer.from(await createDemo(1).arrayBuffer());
  const pcm = source.subarray(44), long = Buffer.concat([source.subarray(0, 44), pcm, pcm, pcm, pcm]);
  long.writeUInt32LE(long.length - 8, 4); long.writeUInt32LE(long.length - 44, 40);
  const full = await run(long);
  assert.equal(full.bpm, 98); assert.equal(full.key, 'C major');
  assert.equal(full.analyzedSeconds ?? full.moodSeconds, 96);
  assert.equal(full.moodSeconds, 96);
  assert.equal(full.moodPatches, legacy ? 32 : 10);
  assert.deepEqual(full.warnings, []);
  let failure;
  if (!legacy) {
    await page.evaluate(async () => { window.__testWorker.terminate(); window.__testWorker = null; for (const name of await caches.keys()) await caches.delete(name); });
    await page.route('**/models/clap-audio/**', route => route.fulfill({ status: 503, body: 'Test model unavailable' }));
    failure = await run(recording);
    assert.ok(Math.abs(failure.bpm - 120) <= 1);
    assert.equal(failure.danceability, null); assert.equal(failure.happiness, null);
    assert.equal(failure.moodStatus, 'Unavailable');
    assert.equal(requests.some(r => /\/api\/analysis\/legacy\/|\/vendor\/(?:essentia|tf)|\/models\/(?:musicnn|mood_happy|danceability)\//.test(r.url)), false);
  }
  const unexpectedPosts = requests.filter(r => r.method === 'POST' && !r.url.includes('__nextjs') && !r.performanceBeacon);
  assert.deepEqual(unexpectedPosts.map(r => r.url), [], 'No audio uploads or unexpected POST requests');
  assert.deepEqual(errors, []);
  const summarize = ({ waveform, ...result }) => result;
  const report = { engine: legacy ? 'legacy' : 'commercial', elapsedSeconds: (Date.now() - started) / 1000, free: summarize(free), actualMp3: summarize(first), repeatIdentical: true, full96Seconds: summarize(full), modelUnavailable: failure ? summarize(failure) : undefined, errors, workerErrors, performanceBeacons: requests.filter(r=>r.performanceBeacon).length, audioUploads: 0 };
  await mkdir('artifacts/commercial-analysis', { recursive: true });
  await writeFile(`artifacts/commercial-analysis/${legacy ? 'legacy' : 'commercial'}-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
