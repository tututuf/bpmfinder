import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const { EssentiaWASM, Essentia } = require('essentia.js');
const engine = new Essentia(EssentiaWASM);
const pcm = await readFile(new URL('../artifacts/audio-diagnosis/sample-44100.f32', import.meta.url));
const samples = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
const resampled = engine.arrayToVector(samples);
const result = {};
try {
  for (const method of ['multifeature', 'degara']) {
    const rhythm = engine.RhythmExtractor2013(resampled, 208, method, 40);
    result[method] = { bpm: rhythm.bpm, confidence: rhythm.confidence, ticks: Array.from(engine.vectorToArray(rhythm.ticks)).slice(0, 16) };
    rhythm.ticks.delete(); rhythm.estimates.delete(); rhythm.bpmIntervals.delete();
  }
  result.keys = {};
  for (const profile of ['bgate', 'edma', 'krumhansl', 'temperley', 'shaath']) {
    result.keys[profile] = engine.KeyExtractor(resampled, true, 4096, 4096, 12, 3500, 60, 25, 0.2, profile, 44100);
  }
  console.log(JSON.stringify(result, null, 2));
  await writeFile(new URL('../artifacts/audio-diagnosis/engine-comparison.json', import.meta.url), JSON.stringify(result, null, 2));
} catch (error) { console.error('Engine comparison error:', String(error)); process.exitCode = 1; }
finally { resampled.delete(); engine.shutdown(); }
