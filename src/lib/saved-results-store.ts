import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { SavedResultError, type SavedTrack, type SavedResultSummary, type SavedResult } from './saved-result-data.ts';

type Row = { sequence: number; id: string; saved_at: number; track_count: number; preview: string; tracks_json: string };
const summary = (row: Row): SavedResultSummary => ({ id: row.id, savedAt: row.saved_at, trackCount: row.track_count, preview: row.preview });
export class SavedResultsStore {
  db: DatabaseSync;
  constructor(db: DatabaseSync) {
    this.db = db;
    db.exec(`CREATE TABLE IF NOT EXISTS saved_results (
      sequence INTEGER PRIMARY KEY AUTOINCREMENT, id TEXT NOT NULL UNIQUE,
      identity TEXT NOT NULL, request_id TEXT NOT NULL, saved_at INTEGER NOT NULL,
      track_count INTEGER NOT NULL, preview TEXT NOT NULL, tracks_json TEXT NOT NULL,
      UNIQUE(identity, request_id));
      CREATE INDEX IF NOT EXISTS saved_results_owner ON saved_results(identity, sequence DESC);`);
  }
  save(identity: string, requestId: string, tracks: SavedTrack[], now = Date.now()) {
    const json = JSON.stringify(tracks);
    this.db.prepare(`INSERT OR IGNORE INTO saved_results(id,identity,request_id,saved_at,track_count,preview,tracks_json) VALUES (?,?,?,?,?,?,?)`)
      .run(randomUUID(), identity, requestId, now, tracks.length, tracks[0].name, json);
    const row = this.db.prepare('SELECT * FROM saved_results WHERE identity=? AND request_id=?').get(identity, requestId) as Row;
    if (row.tracks_json !== json) throw new SavedResultError('This save request has changed. Please try again.', 409);
    return summary(row);
  }
  list(identity: string, before?: number | null) {
    // JSON RPC converts an explicit undefined array argument to null.
    const boundary = before ?? Number.MAX_SAFE_INTEGER;
    const rows = this.db.prepare('SELECT sequence,id,saved_at,track_count,preview FROM saved_results WHERE identity=? AND sequence<? ORDER BY sequence DESC LIMIT 21').all(identity, boundary) as Row[];
    return { results: rows.slice(0, 20).map(summary), nextCursor: rows.length > 20 ? String(rows[19].sequence) : null };
  }
  get(identity: string, id: string): SavedResult | null {
    const row = this.db.prepare('SELECT * FROM saved_results WHERE identity=? AND id=?').get(identity, id) as Row | undefined;
    return row ? { ...summary(row), tracks: JSON.parse(row.tracks_json) } : null;
  }
  delete(identity: string, id: string) { return this.db.prepare('DELETE FROM saved_results WHERE identity=? AND id=?').run(identity, id).changes > 0; }
}
