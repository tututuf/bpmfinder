export const DEMOS = [
  { id: 'demo-1', name: 'After hours', artist: 'Midnight sessions', bpm: 124, key: 'A minor', camelot: '8A', root: 57, minor: true, color: 'violet' },
  { id: 'demo-2', name: 'Sunday kind of love', artist: 'The slow collection', bpm: 98, key: 'C major', camelot: '8B', root: 60, minor: false, color: 'peach' },
  { id: 'demo-3', name: 'Somewhere new', artist: 'Open skies', bpm: 128, key: 'D minor', camelot: '7A', root: 62, minor: true, color: 'blue' },
];

export function createDemo(index: number) {
  const demo = DEMOS[index], rate = 22050, duration = 24, samples = new Float32Array(rate * duration);
  let seed = 73;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate, beat = t * demo.bpm / 60, within = (beat % 1) * 60 / demo.bpm;
    const kick = Math.sin(2 * Math.PI * (48 * within + 8 * (1 - Math.exp(-within * 45)))) * Math.exp(-within * 22) * 0.7;
    seed = (seed * 16807) % 2147483647;
    const noise = seed / 2147483647 * 2 - 1;
    const hat = noise * Math.exp(-((beat * 2) % 1) * 26) * 0.06;
    const snare = Math.floor(beat) % 2 ? noise * Math.exp(-within * 30) * 0.18 : 0;
    let chord = 0;
    for (const [n, weight] of [[0, 1.5], [demo.minor ? 3 : 4, 0.85], [7, 0.7]] as const) {
      const hz = 440 * 2 ** ((demo.root + n - 69) / 12);
      chord += Math.sin(2 * Math.PI * hz * t) * 0.065 * weight;
    }
    const fade = Math.min(1, t / 0.1, (duration - t) / 0.3);
    samples[i] = (kick + hat + snare + chord) * fade * 0.8;
  }
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const str = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  str(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); str(8, 'WAVE'); str(12, 'fmt '); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, i) => view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, v)) * 32767, true));
  return new File([buffer], `${demo.name}.wav`, { type: 'audio/wav' });
}
