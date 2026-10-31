import test from 'node:test';
import assert from 'node:assert/strict';
import { camelotFor, normalizeKey, summarizeKeys, signalMetrics } from '../public/analysis-policy.mjs';
import { resultCsv, hasKeyEstimate } from '../src/lib/result-data.ts';

test('normalizes accidental spellings and maps all 24 keys without duplicate Camelot codes', () => {
  assert.equal(normalizeKey('Bb', 'minor'), 'B♭ minor');
  assert.equal(normalizeKey('F#', 'major'), 'F♯ major');
  assert.equal(camelotFor('B major'), '1B');
  assert.equal(camelotFor('A minor'), '8A');
  assert.equal(camelotFor('Undetermined'), '—');
  const codes = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].flatMap(n => ['major', 'minor'].map(m => camelotFor(`${n} ${m}`)));
  assert.equal(new Set(codes).size, 24);
});
const observations = () => [1, 2, 3].flatMap(segment => ['bgate', 'temperley', 'krumhansl'].map(profile => ({ key: 'A', scale: 'minor', strength: 0.75, segment, profile })));
test('accepts agreement across profiles and sections with independent tonal evidence', () => {
  const result = summarizeKeys(observations(), 'A minor');
  assert.equal(result.key, 'A minor');
  assert.equal(result.keyAgreement, 100);
});
test('shows best candidates with low confidence on weak tonal support or disagreement', () => {
  const weak = summarizeKeys(observations(), 'Undetermined');
  assert.equal(weak.key, 'A minor');
  assert.equal(weak.keyConfidence, 'low');
  assert.equal(weak.keyStatus, 'Low-confidence estimate');
  const changes = observations().map(o => o.segment === 3 ? { ...o, key: 'D' } : o);
  assert.equal(summarizeKeys(changes, 'A minor').key, 'A minor');
  assert.equal(summarizeKeys(changes, 'A minor').keyConfidence, 'low');
  assert.ok(summarizeKeys(changes, 'A minor').keyCandidates.length > 1);
  assert.equal(summarizeKeys([], 'A minor').key, 'Undetermined');
});

test('breaks tied votes by mean fit and derives Camelot from the selected estimate', () => {
  const input = [
    { key: 'G', scale: 'minor', strength: .448, profile: 'bgate', segment: 1 },
    { key: 'D', scale: 'minor', strength: .538, profile: 'temperley', segment: 1 },
    { key: 'D', scale: 'major', strength: .452, profile: 'krumhansl', segment: 1 },
  ];
  const result = summarizeKeys(input, 'Undetermined');
  assert.equal(result.key, 'D minor');
  assert.equal(result.camelot, '7A');
  assert.equal(result.keyConfidence, 'low');
  assert.equal(result.keyAgreement, 33);
  assert.equal(summarizeKeys([...input].reverse(), 'Undetermined').key, result.key);
  const majority = summarizeKeys([...input, { ...input[0], profile: 'extra' }], 'Undetermined');
  assert.equal(majority.key, 'G minor', 'Profile votes take precedence over fit');
});

test('does not invent a key when candidates are empty, invalid or zero-strength', () => {
  const result = summarizeKeys([{ key: 'B', scale: 'major', strength: 0, segment: 1 }, { key: 'C', scale: 'minor', strength: NaN, segment: 1 }, { key: 'unknown', scale: 'minor', strength: .9, segment: 1 }], 'Undetermined');
  assert.equal(result.key, 'Undetermined');
  assert.equal(result.camelot, '—');
  assert.equal(result.keyConfidence, 'unavailable');
});

test('key availability uses the displayed key without confidence classifications', () => {
  const track = { id: '1', name: 'Candidate', status: 'ready', key: 'D minor', keyConfidence: 'low' };
  assert.equal(hasKeyEstimate(track), true);
  assert.equal(hasKeyEstimate({ ...track, keyEdited: true }), true);
  assert.equal(hasKeyEstimate({ ...track, keyConfidence: 'consistent' }), true);
  assert.equal(hasKeyEstimate({ ...track, key: 'Undetermined' }), false);
  assert.equal(hasKeyEstimate({ ...track, status: 'processing' }), false);
  const csv = resultCsv([{ ...track, bpm: 120, camelot: '7A', keyStatus: 'Low-confidence estimate' }], true);
  assert.doesNotMatch(csv, /Low-confidence|Key status|Profile agreement/i);
});
test('signal energy is explicitly level-dependent and bounded', () => {
  const quiet = signalMetrics(new Float32Array(1000).fill(.001));
  const loud = signalMetrics(new Float32Array(1000).fill(.1));
  assert.equal(quiet.rmsDb, -60);
  assert.equal(quiet.energy, 0);
  assert.ok(loud.energy > quiet.energy);
  assert.equal(signalMetrics(new Float32Array(1000)).energy, 0);
});
test('CSV contains measurements and safe user-controlled text without internal analysis fields', () => {
  const csv = resultCsv([{ id: '1', name: ' =1+1', bpm: 120, duration: 10, key: 'B major', camelot: '1B', status: 'ready', energy: 40, danceability: 55, happiness: 60, keyEdited: true, analysisVersion: 'essentia-3', engine: 'internal-engine', tempoReference: 60, waveform: [], color: 'blue' }], true);
  assert.match(csv, /"' =1\+1"/);
  assert.match(csv, /Danceability \(model\)/);
  assert.doesNotMatch(csv, /Tempo reference|Engine|Source|Analysis version|Manually edited|essentia-3|internal-engine/);
});
