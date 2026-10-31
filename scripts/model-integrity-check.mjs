import { chromium } from '@playwright/test';
import { createDemo } from '../src/lib/demo.ts';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000');
  const input = Buffer.from(await createDemo(0).arrayBuffer()).toString('base64');
  const report = await page.evaluate(async base64 => {
    const context = new AudioContext();
    const audio = await context.decodeAudioData(Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer);
    const data = {};
    for (const [name, rate] of [['samples', 11025], ['tonalSamples', 44100], ['moodSamples', 16000]]) {
      const offline = new OfflineAudioContext(1, Math.ceil(8 * rate), rate);
      const source = offline.createBufferSource(); source.buffer = audio; source.connect(offline.destination); source.start();
      data[name] = (await offline.startRendering()).getChannelData(0);
    }
    await context.close();
    const { analyzeTrack } = await import('/advanced-analysis.mjs');
    const first = await analyzeTrack(data);
    const baseline = globalThis.tf.memory().numTensors;
    const second = await analyzeTrack(data);
    const after = globalThis.tf.memory().numTensors;
    const { default: Essentia } = await import('/vendor/essentia-core.es.js');
    const { EssentiaWASM } = await import('/vendor/essentia-wasm.es.js');
    const essentia = new Essentia(EssentiaWASM);
    const tf = globalThis.tf;
    const model = await tf.loadGraphModel('/models/musicnn/model.json');
    const reconstructionError = tf.tidy(() => {
      const input = tf.zeros([1, 187, 96]);
      const outputs = model.execute({ 'model/Placeholder': input, 'model/Placeholder_1': tf.scalar(false, 'bool') }, ['model/batch_normalization_9/batchnorm/add_1', 'model/dense/Relu']);
      const preActivation = tf.add(tf.matMul(outputs[0], model.weights['dense/kernel'][0]), model.weights['dense/bias'][0]);
      return tf.max(tf.abs(tf.sub(tf.relu(preActivation), outputs[1]))).dataSync()[0];
    });
    model.dispose(); essentia.delete();
    return { first: { bpm: first.bpm, key: first.key, moodStatus: first.moodStatus, backend: first.moodBackend }, second: { bpm: second.bpm, key: second.key, moodStatus: second.moodStatus }, baselineTensors: baseline, afterTensors: after, reconstructionError };
  }, input);
  assert.equal(report.first.moodStatus, 'Model estimate');
  assert.equal(report.second.moodStatus, 'Model estimate');
  assert.equal(report.first.key, 'A minor');
  assert.equal(report.afterTensors, report.baselineTensors, 'Per-track inference must not retain extra tensors.');
  assert.ok(report.reconstructionError < 0.0001, 'Reconstructed pre-ReLU embedding must match the fused dense operation.');
  await writeFile(new URL('../artifacts/upgrade/model-integrity.json', import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
