import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAudio } from '../public/audio-analysis.mjs';
import { ANALYSIS_VERSION } from '../public/advanced-analysis.mjs';
import { ANALYSIS_VERSION as UI_VERSION } from '../src/lib/analysis-version.ts';
import { createDemo, DEMOS } from '../src/lib/demo.ts';
import { camelotFor } from '../public/analysis-policy.mjs';

function clickTrack(bpm, seconds = 16, sampleRate = 11025) {
  const data = new Float32Array(seconds * sampleRate);
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate, phase = t % (60 / bpm);
    data[i] = Math.sin(2 * Math.PI * 95 * phase) * Math.exp(-phase * 65);
  }
  return data;
}

for (const bpm of [80, 98, 120, 128, 160]) {
  test(`detects a synthetic ${bpm} BPM pulse within 1 BPM`, () => {
    const result = analyzeAudio(clickTrack(bpm));
    assert.ok(result.bpm && Math.abs(result.bpm - bpm) <= 1, `Expected ${bpm}, received ${result.bpm}`);
    assert.equal(result.waveform.length, 90);
  });
}

test('rejects silence and audio shorter than 3 seconds', () => {
  assert.throws(() => analyzeAudio(new Float32Array(11025 * 4)), /silent/);
  assert.throws(() => analyzeAudio(new Float32Array(11025)), /3 seconds/);
});

test('identifies an A minor chord with its Camelot code', () => {
  const sampleRate = 11025, audio = new Float32Array(sampleRate * 10);
  for (let i = 0; i < audio.length; i++) {
    const t = i / sampleRate;
    audio[i] = 0.3 * Math.sin(2 * Math.PI * 220 * t) + 0.2 * Math.sin(2 * Math.PI * 261.625565 * t) + 0.15 * Math.sin(2 * Math.PI * 329.627557 * t);
  }
  const result = analyzeAudio(audio);
  assert.equal(result.key, 'A minor');
  assert.equal(result.camelot, '8A');
});

for (const notes of [[60, 64, 67], [60, 64, 67, 69], [60, 62, 64, 67, 69], [60, 62, 64, 65, 67, 69, 71]]) {
  test(`retains the ranked key for tonal notes ${notes.join('/')} when related keys are close`, () => {
    const rate = 11025;
    const samples = Float32Array.from({ length: rate * 8 }, (_, i) => notes.reduce((sum, note) => sum + .04 * Math.sin(2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * i / rate), 0));
    const result = analyzeAudio(samples);
    assert.equal(result.key, 'C major');
    assert.equal(result.camelot, '8B');
    assert.equal(result.keyCandidates.length, 3);
    assert.equal(result.keyCandidates[0].key, result.key);
    assert.ok(result.keyCandidates[0].strength - result.keyCandidates[1].strength < .05);
  });
}

test('all 24 transposed major/minor triads retain a key and matching Camelot', () => {
  const notes = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  for (const mode of ['major', 'minor']) for (let root = 0; root < 12; root++) {
    const chord = [48 + root, 48 + root + (mode === 'major' ? 4 : 3), 48 + root + 7];
    const audio = Float32Array.from({ length: 11025 * 4 }, (_, i) => chord.reduce((sum, note) => sum + .04 * Math.sin(2 * Math.PI * 440 * 2 ** ((note - 69) / 12) * i / 11025), 0));
    const result = analyzeAudio(audio);
    assert.equal(result.key, `${notes[root]} ${mode}`);
    assert.equal(result.camelot, camelotFor(result.key));
    for (const candidate of result.keyCandidates) assert.equal(candidate.camelot, camelotFor(candidate.key));
  }
});

test('uniform chromatic audio has no preferred key candidate', () => {
  const audio = Float32Array.from({ length: 11025 * 8 }, (_, i) => Array.from({ length: 12 }, (_, note) => .02 * Math.sin(2 * Math.PI * 440 * 2 ** ((48 + note - 69) / 12) * i / 11025)).reduce((a, b) => a + b, 0));
  const result = analyzeAudio(audio);
  assert.equal(result.key, 'Undetermined');
  assert.equal(result.camelot, '—');
  assert.deepEqual(result.keyCandidates, []);
});

test('UI exports and worker use the same analysis version', () => {
  assert.equal(ANALYSIS_VERSION, UI_VERSION);
});

for (const rate of [11025, 22050, 44100]) {
  test(`preserves 120 BPM at ${rate} Hz`, () => {
    assert.ok(Math.abs(analyzeAudio(clickTrack(120, 12, rate), rate).bpm - 120) <= 1);
  });
}

for (const [index, demo] of DEMOS.entries()) {
  test(`retains ${demo.key} in a chord and drum mix at both supported test rates`, async () => {
    const bytes = await createDemo(index).arrayBuffer(), view = new DataView(bytes);
    for (const stride of [1, 2]) {
      const rate = 22050 / stride;
      const samples = Float32Array.from({ length: Math.floor((bytes.byteLength - 44) / (2 * stride)) }, (_, i) => view.getInt16(44 + i * 2 * stride, true) / 32768);
      const result = analyzeAudio(samples, rate);
      assert.ok(Math.abs(result.bpm - demo.bpm) <= 1);
      assert.equal(result.key, demo.key);
      assert.equal(result.camelot, demo.camelot);
    }
  });
}

for (const percussive of [false, true]) {
  test(`abstains from assigning a musical key to ${percussive ? 'broadband percussion' : 'white noise'}`, () => {
    let seed = 73;
    const samples = Float32Array.from({ length: 11025 * 16 }, (_, i) => {
      seed = seed * 16807 % 2147483647;
      return (seed / 2147483647 * 2 - 1) * 0.4 * (percussive ? Math.exp(-(i / 11025 % 0.5) * 30) : 1);
    });
    const result = analyzeAudio(samples);
    assert.equal(result.key, 'Undetermined');
    assert.equal(result.camelot, '—');
    assert.match(result.keyNote, /No clear tonal center/);
  });
}
