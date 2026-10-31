import test from 'node:test';
import assert from 'node:assert/strict';
import { camelotKeys, compatibleKeys, noteMilliseconds, tempoFromInput, nextTapTimes, tempoFromTaps, formatMusicNumber } from '../src/lib/music-tools.ts';

test('Camelot reference has all 24 unique canonical keys', () => {
  assert.equal(camelotKeys.length, 24);
  assert.equal(new Set(camelotKeys.map(k => k.key)).size, 24);
  for (const [code, key] of [['8A', 'A minor'], ['8B', 'C major'], ['1B', 'B major'], ['5B', 'E♭ major'], ['5A', 'C minor']]) {
    assert.equal(camelotKeys.find(k => k.code === code).key, key);
  }
  for (const key of camelotKeys) {
    const matches = compatibleKeys(key.code);
    assert.equal(matches.length, 4);
    assert.equal(new Set(matches.map(k => k.code)).size, 4);
    assert.equal(matches[3].code.slice(0, -1), key.code.slice(0, -1));
    assert.notEqual(matches[3].mode, key.mode);
    for (const related of matches) assert.ok(compatibleKeys(related.code).some(k => k.code === key.code));
  }
});
test('Camelot neighbors wrap 1 to 12 and reject unknown codes', () => {
  assert.deepEqual(compatibleKeys('1A').map(k => k.code), ['1A','12A','2A','1B']);
  assert.deepEqual(compatibleKeys('12B').map(k => k.code), ['12B','11B','1B','12A']);
  for (const code of ['0A','13B','8C','8a','']) assert.deepEqual(compatibleKeys(code), []);
});
test('tempo calculator uses quarter-note beats with dotted and triplet ratios', () => {
  assert.equal(noteMilliseconds(120), 500);
  assert.equal(noteMilliseconds(120, 4), 2000);
  assert.equal(noteMilliseconds(120, .5, 1.5), 375);
  assert.ok(Math.abs(noteMilliseconds(120, .5, 2/3) - 166.66666666666666) < 1e-9);
  assert.equal(noteMilliseconds(96, .25), 156.25);
  assert.equal(tempoFromInput('500', 'ms'), 120);
  assert.equal(tempoFromInput('120.5', 'bpm'), 120.5);
  for (const bpm of [1, 60, 96.5, 120, 1000]) assert.ok(Math.abs(tempoFromInput(String(60000 / bpm), 'ms') - bpm) < 1e-9);
});
test('invalid calculator input stays empty and formatting is stable', () => {
  for (const value of ['', ' ', '0','-1','NaN','Infinity','1000.1']) assert.equal(tempoFromInput(value, 'bpm'), null);
  for (const value of ['0', '59', '60001']) assert.equal(tempoFromInput(value, 'ms'), null);
  for (const value of [0, -2, Infinity, NaN]) assert.equal(noteMilliseconds(value), null);
  assert.equal(noteMilliseconds(120, 0), null);
  assert.equal(formatMusicNumber(null), '—');
  assert.equal(formatMusicNumber(Infinity), '—');
  assert.equal(formatMusicNumber(166.666666666), '166.667');
});
test('tapping uses intervals, caps the window and restarts after a pause', () => {
  assert.equal(tempoFromTaps([]), null);
  assert.equal(tempoFromTaps([0]), null);
  assert.equal(tempoFromTaps([0,500,1000,1500]), 120);
  assert.equal(tempoFromTaps([0,600,1200]), 100);
  assert.equal(tempoFromTaps([1,1]), null);
  let taps = [];
  for (let i=0; i<20; i++) taps = nextTapTimes(taps, i*500);
  assert.equal(taps.length, 12);
  assert.equal(taps[0], 4000);
  assert.equal(tempoFromTaps(taps), 120);
  assert.deepEqual(nextTapTimes(taps, 9500), taps);
  assert.deepEqual(nextTapTimes(taps, 9400), taps);
  assert.deepEqual(nextTapTimes(taps, 12501), [12501]);
  assert.equal(nextTapTimes(taps, 12000).length, 12);
});
