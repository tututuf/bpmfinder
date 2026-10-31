import test from 'node:test';
import assert from 'node:assert/strict';
import { moodWindows, MOOD_WINDOW_SAMPLES as size } from '../public/analysis-windows.mjs';
import { summarizeKeys } from '../public/analysis-policy.mjs';

test('mood windows cover every sample, including the beginning and incomplete tail', () => {
  for (const length of [size, size + 1, size * 4, 32040 * 16, 600 * 16000]) {
    const windows = moodWindows(length);
    assert.equal(windows[0].start, 0);
    assert.equal(windows.at(-1).start + size, length);
    assert.equal(windows.reduce((sum, window) => sum + window.weight, 0), length);
    let covered = 0;
    for (const window of windows) {
      assert.ok(window.start <= covered, 'No unprocessed gap');
      assert.ok(window.start >= 0 && window.start + size <= length);
      assert.ok(window.weight > 0 && window.weight <= size);
      covered = window.start + size;
    }
  }
  assert.deepEqual(moodWindows(size - 1), []);
});

test('whole-track consistent label needs profile agreement and independent tonal support', () => {
  const observations = ['bgate', 'temperley', 'krumhansl'].map(profile => ({ key: 'C', scale: 'major', strength: .75, segment: 1, start: 0, duration: 96, profile }));
  assert.equal(summarizeKeys(observations, 'C major').key, 'C major');
  assert.equal(summarizeKeys(observations, 'Undetermined').key, 'C major');
  assert.equal(summarizeKeys(observations, 'Undetermined').keyConfidence, 'low');
  observations[2].key = 'G';
  assert.equal(summarizeKeys(observations, 'C major').key, 'C major');
  observations[1].key = 'A';
  assert.equal(summarizeKeys(observations, 'C major').keyConfidence, 'low');
});
