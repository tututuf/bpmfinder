import { KEY_OPTIONS, type Track } from './result-data.ts';
import { camelotFor } from '../../public/analysis-policy.mjs';

export type SavedTrack = Pick<Track, 'id' | 'name' | 'duration' | 'bpm' | 'key' | 'camelot' | 'status' | 'color' | 'analysisVersion' | 'analysisEngine' | 'engine' | 'energy' | 'rmsDb' | 'danceability' | 'happiness' | 'moodMethod' | 'bpmEdited' | 'keyEdited'> & { waveform: [] };
export type SavedResultSummary = { id: string; savedAt: number; trackCount: number; preview: string };
export type SavedResult = SavedResultSummary & { tracks: SavedTrack[] };
export class SavedResultError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
function text(value: unknown, maximum: number, required = false): string | undefined {
  if (value === undefined && !required) return undefined;
  if (typeof value !== 'string' || !value.trim() || value.length > maximum || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new SavedResultError('A result contains invalid text. Please analyze the track again.');
  return value.trim();
}
function number(value: unknown, minimum: number, maximum: number, optional = true): number | undefined {
  if (value === undefined && optional) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new SavedResultError('A result contains an invalid measurement. Please analyze the track again.');
  return value;
}
// Explicit allowlist: audio, file paths, URLs and arbitrary worker fields never enter the database.
export function snapshotTracks(value: unknown): SavedTrack[] {
  if (!Array.isArray(value) || !value.length || value.length > 200) throw new SavedResultError('Choose between 1 and 200 completed tracks to save.');
  const ids = new Set<string>();
  return value.map(item => {
    if (!item || typeof item !== 'object' || item.status !== 'ready') throw new SavedResultError('Only completed analysis results can be saved.');
    const id = text(item.id, 80, true)!;
    if (ids.has(id)) throw new SavedResultError('A track appears more than once in this save.');
    ids.add(id);
    if (!KEY_OPTIONS.includes(item.key)) throw new SavedResultError('A result contains an invalid musical key.');
    if (item.analysisEngine !== undefined && !['commercial', 'legacy'].includes(item.analysisEngine)) throw new SavedResultError('A result contains an invalid analysis engine.');
    return {
      id, name: text(item.name, 300, true)!, duration: number(item.duration, 0, 600, false)!,
      bpm: item.bpm === null ? null : number(item.bpm, 20, 400, false)!,
      key: item.key, camelot: camelotFor(item.key), status: 'ready' as const, waveform: [],
      color: ['violet', 'peach', 'blue'].includes(item.color) ? item.color : 'blue',
      analysisVersion: text(item.analysisVersion, 80), analysisEngine: item.analysisEngine,
      engine: text(item.engine, 150), moodMethod: text(item.moodMethod, 150),
      energy: number(item.energy, 0, 100), rmsDb: number(item.rmsDb, -120, 12),
      danceability: item.danceability === null ? null : number(item.danceability, 0, 100),
      happiness: item.happiness === null ? null : number(item.happiness, 0, 100),
      bpmEdited: item.bpmEdited === true, keyEdited: item.keyEdited === true,
    };
  });
}
export function saveRequest(value: Record<string, unknown>) {
  if (typeof value.requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.requestId)) throw new SavedResultError('Please retry saving your results.');
  return { requestId: value.requestId, tracks: snapshotTracks(value.tracks) };
}
export function canSaveResults(runtime: string | undefined, hasPro: boolean) { return runtime === 'development' || hasPro; }
