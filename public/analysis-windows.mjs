// Fixed-size model inputs, with the final window aligned to the end of the track.
// Weight only newly covered samples so the overlapping tail is not counted twice.
export const MOOD_WINDOW_SAMPLES = 512 + 256 * 186;
export function moodWindows(sampleCount) {
  const size = MOOD_WINDOW_SAMPLES;
  if (sampleCount < size) return [];
  const windows = [];
  let covered = 0;
  while (covered < sampleCount) {
    const start = Math.min(covered, sampleCount - size);
    const end = start + size;
    windows.push({ start, length: size, weight: end - covered });
    covered = end;
  }
  return windows;
}
