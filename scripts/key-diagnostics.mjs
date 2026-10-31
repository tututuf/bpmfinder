import { createRequire } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import { analyzeAudio } from '../public/audio-analysis.mjs';
const require = createRequire(import.meta.url);
const { Essentia, EssentiaWASM } = require('essentia.js');
const engine = new Essentia(EssentiaWASM);
const pcm = await readFile(new URL('../artifacts/audio-diagnosis/sample-44100.f32', import.meta.url));
const samples = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
const vector = engine.arrayToVector(samples);
const results = [];
try {
  for (const hpcpSize of [12, 36]) {
    for (const minFrequency of [25, 65]) {
      for (const correction of hpcpSize === 12 ? [true] : [true, false]) {
        for (const profile of ['bgate', 'braw', 'edma', 'edmm', 'krumhansl', 'temperley', 'shaath', 'gomez']) {
          const output = engine.KeyExtractor(vector, correction, 4096, 4096, hpcpSize, 3500, 60, minFrequency, .2, profile, 44100);
          results.push({ hpcpSize, minFrequency, correction, profile, ...output });
        }
      }
    }
  }
} finally { vector.delete(); engine.delete(); }
const report = { duration: samples.length / 44100, sampleRate: 44100, localDsp: analyzeAudio(samples, 44100), results };
await writeFile(new URL('../artifacts/audio-diagnosis/key-diagnostics.json', import.meta.url), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, localDsp: { key: report.localDsp.key, bpm: report.localDsp.bpm } }, null, 2));
