import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { analyzeAudio, NOTES } from '../public/audio-analysis.mjs';
import { summarizeKeys } from '../public/analysis-policy.mjs';
const require = createRequire(import.meta.url);
const { Essentia, EssentiaWASM } = require('essentia.js');
const engine = new Essentia(EssentiaWASM);
const rows = [];
try {
  for (const mode of ['major', 'minor']) for (let root = 0; root < 12; root++) {
    const rate = 44100, duration = 16, samples = new Float32Array(rate * duration);
    for (let i = 0; i < samples.length; i++) {
      const t = i / rate, position = Math.floor(t / 2) % 4;
      const chordRoot = root + [0, 5, 7, 0][position];
      const envelope = Math.min(1, (t % 2) / .04) * Math.exp(-(t % 2) * .15);
      let chord = 0;
      for (const [interval, level] of [[0, .14], [mode === 'major' ? 4 : 3, .09], [7, .08]]) {
        const hz = 440 * 2 ** ((48 + chordRoot + interval - 69) / 12);
        for (let harmonic = 1; harmonic <= 4; harmonic++) chord += level / harmonic * Math.sin(2 * Math.PI * hz * harmonic * t);
      }
      const beat = t % .5;
      samples[i] = chord * envelope + .25 * Math.sin(2 * Math.PI * 55 * beat) * Math.exp(-beat * 35);
    }
    const local = analyzeAudio(Float32Array.from({ length: samples.length / 4 }, (_, i) => samples[i * 4]), 11025);
    const vector = engine.arrayToVector(samples), observations = [];
    try {
      for (const profile of ['bgate', 'temperley', 'krumhansl']) observations.push({ ...engine.KeyExtractor(vector, true, 4096, 4096, 36, 3500, 60, 65, .2, profile, rate), profile, segment: 1 });
    } finally { vector.delete(); }
    const result = summarizeKeys(observations, local.key);
    rows.push({ expected: `${NOTES[root]} ${mode}`, local: local.key, key: result.key, agreement: result.keyAgreement, candidates: result.keyCandidates, observations });
  }
} finally { engine.delete(); }
await writeFile(new URL('../artifacts/audio-diagnosis/key-fixtures.json', import.meta.url), JSON.stringify(rows, null, 2));
const mismatches = rows.filter(row => row.key !== row.expected);
assert.deepEqual(mismatches, [], 'Known synthetic chord progressions should retain their transposed major/minor keys');
console.log(JSON.stringify({ total: rows.length, matched: rows.length - mismatches.length, bMajor: rows.find(row => row.expected === 'B major'), mismatches }, null, 2));
