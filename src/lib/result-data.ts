export type KeyCandidate = { key: string; camelot: string; votes: number; strength: number; segments: number };
export type KeyObservation = { key: string; scale: string; profile: string; strength: number; segment: number; start: number; duration: number };
export type Track = {
  id: string; name: string; artist?: string; duration: number; bpm: number | null; originalBpm?: number | null;
  key: string; camelot: string; originalKey?: string; originalCamelot?: string; color: string;
  status: 'ready' | 'queued' | 'processing' | 'error'; message?: string; waveform: number[]; demo?: number; strength?: string;
  analysisVersion?: string; analysisEngine?: 'commercial' | 'legacy'; analysisScope?: 'full'; keyNote?: string; engine?: string; keyStatus?: string; keyAgreement?: number; keyConfidence?: 'consistent' | 'low' | 'unavailable';
  keyCandidates?: KeyCandidate[]; keyObservations?: KeyObservation[]; tempoReference?: number | null; tempoStatus?: string; beatCount?: number;
  energy?: number; rmsDb?: number; peakDb?: number; crestDb?: number;
  danceability?: number | null; happiness?: number | null; moodMethod?: string; moodStatus?: string; moodPatches?: number; moodSeconds?: number; moodBackend?: string;
  warnings?: string[]; bpmEdited?: boolean; keyEdited?: boolean; analyzedSeconds?: number; analyzedOffset?: number;
};
export const KEY_OPTIONS = ['Undetermined', ...['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'].flatMap(note => [`${note} major`, `${note} minor`])];

export function hasKeyEstimate(track: Track) {
  return track.status === 'ready' && track.key !== 'Undetermined' && KEY_OPTIONS.includes(track.key);
}

export function csvCell(value: unknown) {
  const text = String(value ?? '');
  return `"${/^[\s]*[=+@\-\t\r]/.test(text) ? "'" : ''}${text.replaceAll('"', '""')}"`;
}
export function resultCsv(tracks: Track[], premium = false) {
  const fields = ['Track', 'BPM', 'Key', 'Camelot', 'Duration (seconds)', ...(premium ? ['Energy (signal)', 'RMS (dBFS)', 'Danceability (model)', 'Happiness (model)', 'Insight method'] : [])];
  const rows = tracks.filter(t => t.status === 'ready').map(t => [t.name, t.bpm, t.key, t.camelot, t.duration, ...(premium ? [t.energy, t.rmsDb, t.danceability, t.happiness, t.moodMethod] : [])]);
  return '\uFEFF' + [fields, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
