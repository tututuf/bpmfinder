import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const file = process.argv[2];
if (!file) throw new Error('Supply the original recording');
const bytes = await readFile(file);
const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
const page = await browser.newPage();
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  const report = await page.evaluate(async base64 => {
    const { EssentiaWASM } = await import('/vendor/essentia-wasm.es.js');
    const { default: Essentia } = await import('/vendor/essentia-core.es.js');
    const engine = new Essentia(EssentiaWASM);
    const context = new AudioContext();
    const decoded = await context.decodeAudioData(Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer);
    const rows = [];
    for (const channel of ['mix', ...Array.from({ length: decoded.numberOfChannels }, (_, index) => index)]) {
      let buffer = decoded;
      if (channel !== 'mix') {
        buffer = context.createBuffer(1, decoded.length, decoded.sampleRate);
        buffer.copyToChannel(decoded.getChannelData(channel), 0);
      }
      const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 44100), 44100);
      const source = offline.createBufferSource(); source.buffer = buffer; source.connect(offline.destination); source.start();
      const audio = (await offline.startRendering()).getChannelData(0);
      let power = 0;
      for (const value of audio) power += value ** 2;
      const vector = engine.arrayToVector(audio), profiles = [];
      try {
        for (const profile of ['bgate', 'temperley', 'krumhansl']) profiles.push({ profile, ...engine.KeyExtractor(vector, true, 4096, 4096, 36, 3500, 60, 65, .2, profile, 44100) });
      } finally { vector.delete(); }
      rows.push({ channel, sampleRate: 44100, samples: audio.length, rmsDb: 10 * Math.log10(power / audio.length), profiles });
    }
    const result = { duration: decoded.duration, decodeSampleRate: decoded.sampleRate, channels: decoded.numberOfChannels, rows };
    engine.delete(); await context.close();
    return result;
  }, bytes.toString('base64'));
  const output = { sha256: createHash('sha256').update(bytes).digest('hex'), ...report };
  await writeFile(new URL('../artifacts/audio-diagnosis/key-stereo.json', import.meta.url), JSON.stringify(output, null, 2));
  console.log(JSON.stringify(output, null, 2));
} finally { await browser.close(); }
