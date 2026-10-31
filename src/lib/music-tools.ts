import { camelotFor, NOTE_NAMES } from '../../public/analysis-policy.mjs';

export const camelotKeys = Array.from({ length: 12 }, (_, i) => ['A', 'B'].map(letter => {
  const code = `${i + 1}${letter}`;
  const mode = letter === 'A' ? 'minor' : 'major';
  const key = NOTE_NAMES.map(note => `${note} ${mode}`).find(key => camelotFor(key) === code)!;
  return { code, key, note: key.split(' ')[0], mode };
})).flat();
export function compatibleKeys(code: string) {
  const current = camelotKeys.find(k => k.code === code);
  if (!current) return [];
  const n = Number.parseInt(code), letter = code.at(-1)!;
  return [code, `${(n + 10) % 12 + 1}${letter}`, `${n % 12 + 1}${letter}`, `${n}${letter === 'A' ? 'B' : 'A'}`]
    .map(value => camelotKeys.find(k => k.code === value)!);
}
export const noteValues = [
  { value: 'whole', label: 'Whole note', beats: 4 }, { value: 'half', label: 'Half note', beats: 2 },
  { value: 'quarter', label: 'Quarter note', beats: 1 }, { value: 'eighth', label: 'Eighth note', beats: .5 },
  { value: 'sixteenth', label: 'Sixteenth note', beats: .25 }, { value: 'thirty-second', label: '32nd note', beats: .125 },
] as const;
export const timingValues = [{ value: 'straight', label: 'Straight', factor: 1 }, { value: 'dotted', label: 'Dotted', factor: 1.5 }, { value: 'triplet', label: 'Triplet', factor: 2 / 3 }] as const;
export function tempoFromInput(value: string, unit: 'bpm' | 'ms') {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return null;
  const bpm = unit === 'bpm' ? number : 60000 / number;
  return bpm >= 1 && bpm <= 1000 ? bpm : null;
}
export function noteMilliseconds(bpm: number, beats = 1, factor = 1) {
  return Number.isFinite(bpm) && bpm > 0 && Number.isFinite(beats) && beats > 0 && Number.isFinite(factor) && factor > 0 ? 60000 / bpm * beats * factor : null;
}
export function formatMusicNumber(value: number | null, decimals = 3) {
  return value === null || !Number.isFinite(value) ? '—' : Number(value.toFixed(decimals)).toLocaleString('en-US', { maximumFractionDigits: decimals });
}
export function nextTapTimes(times: number[], now: number) {
  if (!times.length || now - times.at(-1)! > 2500) return [now];
  if (now <= times.at(-1)!) return times;
  return [...times.slice(-11), now];
}
export function tempoFromTaps(times: number[]) {
  return times.length < 2 || times.at(-1)! <= times[0] ? null : Math.round(60000 * (times.length - 1) / (times.at(-1)! - times[0]));
}
