import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { snapshotTracks, saveRequest, canSaveResults } from '../src/lib/saved-result-data.ts';
import { SavedResultsStore } from '../src/lib/saved-results-store.ts';
const track = (patch = {}) => ({ id: 'track-one', name: ' =A musical file', status: 'ready', duration: 32.04, bpm: 120, key: 'B major', camelot: 'wrong', color: 'blue', energy: 68, danceability: 67, happiness: null, analysisVersion: 'commercial-clap-2', ...patch });

test('snapshots normalize Camelot, retain edits and only allow analysis fields', () => {
  const [saved] = snapshotTracks([track({ bpmEdited: true, audio: 'secret-bytes', url: 'blob:private', waveform: [1, 2], arbitrary: { secret: true } })]);
  assert.equal(saved.camelot, '1B'); assert.equal(saved.bpmEdited, true);
  assert.equal(saved.happiness, null); assert.deepEqual(saved.waveform, []);
  for (const key of ['audio', 'url', 'arbitrary']) assert.equal(Object.hasOwn(saved, key), false);
});
test('invalid, incomplete and oversized snapshots cannot be stored', () => {
  for (const patch of [{ status: 'processing' }, { bpm: NaN }, { bpm: 999 }, { duration: -1 }, { energy: 101 }, { danceability: '99' }, { key: '<script>' }, { name: 'x'.repeat(301) }, { analysisEngine: 'unknown' }]) assert.throws(() => snapshotTracks([track(patch)]));
  for (const value of [null, {}, [], Array.from({ length: 201 }, () => track()), [track(), track()]]) assert.throws(() => snapshotTracks(value));
  assert.throws(() => saveRequest({ requestId: 'invalid', tracks: [track()] }));
  assert.equal(saveRequest({ requestId: randomUUID(), tracks: [track()] }).tracks.length, 1);
  const [unknown] = snapshotTracks([track({ key: 'Undetermined', bpm: null })]);
  assert.equal(unknown.camelot, '—'); assert.equal(unknown.bpm, null);
});
test('only development bypasses paid saving; production and test still need Pro', () => {
  assert.equal(canSaveResults('development', false), true);
  for (const runtime of ['production', 'test', undefined]) { assert.equal(canSaveResults(runtime, false), false); assert.equal(canSaveResults(runtime, true), true); }
});
test('saved results are durable, account scoped, idempotent and owner deletable', () => {
  const folder = mkdtempSync(join(tmpdir(), 'bpm-results-')), path = join(folder, 'account.sqlite');
  let db = new DatabaseSync(path);
  try {
    let store = new SavedResultsStore(db);
    const request = randomUUID(), tracks = snapshotTracks([track()]);
    const first = store.save('alice', request, tracks, 1000);
    assert.deepEqual(store.save('alice', request, tracks, 2000), first);
    assert.throws(() => store.save('alice', request, snapshotTracks([track({ bpm: 121 })])), /changed/);
    assert.equal(store.list('alice').results.length, 1);
    assert.equal(store.get('bob', first.id), null); assert.equal(store.delete('bob', first.id), false);
    assert.deepEqual(store.list('bob').results, []);
    const other = store.save('bob', request, tracks); assert.notEqual(other.id, first.id);
    db.close(); db = new DatabaseSync(path); store = new SavedResultsStore(db);
    assert.equal(store.get('alice', first.id).tracks[0].camelot, '1B');
    assert.equal(store.delete('alice', first.id), true); assert.equal(store.get('alice', first.id), null);
    assert.ok(store.get('bob', other.id));
  } finally { db.close(); rmSync(folder, { recursive: true, force: true }); }
});
test('history cursors paginate equal timestamps without exposing another account', () => {
  const db = new DatabaseSync(':memory:');
  try {
    const store = new SavedResultsStore(db), tracks = snapshotTracks([track()]);
    for (let i = 0; i < 25; i++) { store.save('alice', randomUUID(), tracks, 1000); store.save('bob', randomUUID(), tracks, 1000); }
    const first = store.list('alice'), second = store.list('alice', Number(first.nextCursor));
    assert.equal(first.results.length, 20); assert.equal(second.results.length, 5); assert.equal(second.nextCursor, null);
    assert.equal(new Set([...first.results, ...second.results].map(x => x.id)).size, 25);
    assert.equal(store.list('bob').results.some(x => first.results.some(y => y.id === x.id)), false);
  } finally { db.close(); }
});
