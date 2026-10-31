import test from 'node:test';
import assert from 'node:assert/strict';
import { fullTrackWindows, normalized, scoreEmbedding } from '../public/clap-policy.mjs';
import { analyzeTrack } from '../public/commercial-analysis.mjs';
import { analysisConfiguration, legacyAssetsAllowed } from '../src/lib/analysis-config.ts';
import { resultForAccess } from '../public/analysis-access.mjs';
import { readFileSync } from 'node:fs';
import { keyResult } from '../public/analysis-policy.mjs';

test('key results normalize aliases and always derive Camelot from the selected key', () => {
  assert.deepEqual(keyResult(' Db   major '), { key: 'C♯ major', camelot: '3B' });
  assert.deepEqual(keyResult('B minor'), { key: 'B minor', camelot: '10A' });
  for (const missing of ['', null, undefined, 'Undetermined', '—', 'C major extra', 'invalid']) assert.deepEqual(keyResult(missing), { key: 'Undetermined', camelot: '—' });
});

test('CLAP windows cover all samples and weight the incomplete tail once', () => {
  for (const length of [1, 19, 20, 21, 40, 47, 96, 600]) {
    const windows = fullTrackWindows(length, 20);
    assert.equal(windows.reduce((sum, w) => sum + w.weight, 0), length);
    assert.equal(windows[0].start, 0);
    assert.equal(windows.at(-1).start + windows.at(-1).length, length);
    for (let i = 1; i < windows.length; i++) assert.ok(windows[i].start <= windows[i - 1].start + windows[i - 1].length);
    assert.deepEqual(windows, fullTrackWindows(length, 20));
  }
  for (const bad of [0, -1, NaN, Infinity, 1.2]) assert.deepEqual(fullTrackWindows(bad), []);
});

test('relative CLAP matches preserve ranking, scale and symmetric neutrality', () => {
  const group = { positive: [[1, 0], [2, 0]], negative: [[0, 1], [0, 2]] };
  const prompts = { danceability: group, happiness: group };
  const positive = scoreEmbedding([1, 0], prompts), negative = scoreEmbedding([0, 1], prompts);
  assert.ok(positive.danceability > 99 && negative.danceability < 1);
  assert.equal(scoreEmbedding([1, 1], prompts).happiness, 50);
  assert.deepEqual(scoreEmbedding([100, 0], prompts), positive);
  assert.throws(() => normalized([NaN]), /Invalid/);
  assert.throws(() => normalized([0, 0]), /Empty/);
  assert.throws(() => scoreEmbedding([1, 0, 0], prompts), /Mismatched/);
  assert.throws(() => scoreEmbedding([1, 0], {}), /Missing/);
});

test('commercial default and legacy permissions are independent of billing enablement', () => {
  assert.equal(analysisConfiguration({ NODE_ENV: 'production' }).engine, 'commercial');
  assert.equal(legacyAssetsAllowed({ NODE_ENV: 'production' }), false);
  assert.throws(() => analysisConfiguration({ ANALYSIS_ENGINE: 'legacy', NODE_ENV: 'production' }), /permissions/);
  assert.equal(legacyAssetsAllowed({ ANALYSIS_ENGINE: 'legacy', NODE_ENV: 'production', COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED: 'false' }), false);
  const development = { ANALYSIS_ENGINE: 'legacy', NODE_ENV: 'development' };
  assert.equal(legacyAssetsAllowed(development), true);
  assert.equal(analysisConfiguration(development).moodSampleRate, 16000);
  assert.equal(analysisConfiguration({ ANALYSIS_ENGINE: 'legacy', NODE_ENV: 'production', COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED: 'true' }).engine, 'legacy');
});

test('free commercial analysis succeeds without model assets and premium failure preserves real BPM/key', async () => {
  const rate = 11025;
  const samples = Float32Array.from({ length: rate * 8 }, (_, i) => {
    const phase = i / rate % .5;
    return Math.sin(2 * Math.PI * 95 * phase) * Math.exp(-phase * 65);
  });
  const free = await analyzeTrack({ samples, extended: false });
  assert.ok(Math.abs(free.bpm - 120) <= 1);
  assert.equal(free.analysisEngine, 'commercial');
  assert.equal(free.moodStatus, 'Not requested');
  const visible = resultForAccess(free, false);
  for (const field of ['energy', 'rmsDb', 'danceability', 'happiness', 'moodMethod']) assert.equal(field in visible, false);
  const failed = await analyzeTrack({ samples, moodSamples: new Float32Array(1), extended: true });
  assert.equal(failed.bpm, free.bpm);
  assert.equal(failed.key, free.key);
  assert.equal(failed.danceability, null);
  assert.equal(failed.happiness, null);
  assert.equal(failed.moodStatus, 'Unavailable');
  assert.ok(failed.warnings.length);
});

test('shipped prompt vectors match the pinned score policy and expected shape', () => {
  const prompts = JSON.parse(readFileSync('public/models/clap-audio/text-embeddings.json'));
  assert.equal(prompts.version, 'clap-prompt-pairs-1');
  assert.equal(prompts.revision, 'c28f2883575e590e04d3146ff0713c2448d691ba');
  for (const metric of Object.values(prompts.embeddings)) for (const group of Object.values(metric)) {
    assert.equal(group.length, 4);
    for (const vector of group) {
      assert.equal(vector.length, 512);
      assert.ok(Math.abs(Math.hypot(...vector) - 1) < 1e-6);
    }
  }
});
