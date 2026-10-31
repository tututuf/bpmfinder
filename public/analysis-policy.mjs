export const NOTE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MAJOR = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const MINOR = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
const ALIASES = { 'C#': 1, Db: 1, 'D#': 3, Eb: 3, 'F#': 6, Gb: 6, 'G#': 8, Ab: 8, 'A#': 10, Bb: 10 };
export function normalizeKey(note, mode) {
  const index = ALIASES[note] ?? NOTE_NAMES.indexOf(note);
  return index >= 0 && ['major', 'minor'].includes(mode) ? `${NOTE_NAMES[index]} ${mode}` : 'Undetermined';
}
export function camelotFor(key) {
  const [note, mode] = typeof key === 'string' ? key.trim().split(/\s+/) : [], index = NOTE_NAMES.indexOf(note);
  return index >= 0 && ['major', 'minor'].includes(mode) ? `${(mode === 'major' ? MAJOR : MINOR)[index]}${mode === 'major' ? 'B' : 'A'}` : '—';
}
export function keyResult(value) {
  const parts = typeof value === 'string' ? value.trim().split(/\s+/) : [];
  const key = parts.length === 2 ? normalizeKey(parts[0], parts[1]) : 'Undetermined';
  return { key, camelot: camelotFor(key) };
}
export function summarizeKeys(observations, tonalKey) {
  const groups = new Map();
  for (const observation of observations) {
    const key = normalizeKey(observation.key, observation.scale);
    if (key === 'Undetermined' || !Number.isFinite(observation.strength) || observation.strength <= 0) continue;
    const candidate = groups.get(key) || { key, camelot: camelotFor(key), votes: 0, strength: 0, segments: new Set() };
    candidate.votes++;
    candidate.strength += observation.strength;
    candidate.segments.add(observation.segment);
    groups.set(key, candidate);
  }
  const candidates = [...groups.values()].map(c => ({ key: c.key, camelot: c.camelot, votes: c.votes, strength: c.strength / c.votes, segments: c.segments.size }))
    .sort((a, b) => b.votes - a.votes || b.strength - a.strength);
  const best = candidates[0], total = observations.length;
  const segmentCount = new Set(observations.map(o => o.segment)).size;
  // Agreement and independent evidence determine the label, not whether a usable
  // candidate is shown. Votes rank first, then mean profile fit breaks ties.
  const consistent = best && best.strength >= 0.55 && best.votes / total >= 2 / 3 && best.segments === segmentCount && tonalKey === best.key;
  return {
    key: best ? best.key : 'Undetermined',
    camelot: best ? best.camelot : '—',
    keyStatus: consistent ? 'Consistent estimate' : best ? 'Low-confidence estimate' : 'No key estimate',
    keyConfidence: consistent ? 'consistent' : best ? 'low' : 'unavailable',
    keyAgreement: best ? Math.round(best.votes / total * 100) : 0,
    keyCandidates: candidates.slice(0, 3),
    keyObservations: observations,
    keyNote: consistent ? 'Key profiles agree with tonal evidence. Confirm by ear.' : best ? 'Showing the best-ranked candidate. Key profiles or tonal evidence disagree; confirm this low-confidence estimate by ear.' : 'No usable key candidate was produced. Try audio with a clearer tonal center.',
  };
}

export function signalMetrics(samples) {
  let square = 0, peak = 0;
  for (const value of samples) { square += value * value; peak = Math.max(peak, Math.abs(value)); }
  const rms = Math.sqrt(square / Math.max(1, samples.length));
  const rmsDb = Math.max(-120, 20 * Math.log10(rms || 1e-6));
  return {
    rmsDb: Math.round(rmsDb * 10) / 10,
    peakDb: Math.round(Math.max(-120, 20 * Math.log10(peak || 1e-6)) * 10) / 10,
    crestDb: Math.round((peak > 0 ? 20 * Math.log10(peak / rms) : 0) * 10) / 10,
    energy: Math.round(Math.max(0, Math.min(100, (rmsDb + 60) / 60 * 100))),
  };
}
