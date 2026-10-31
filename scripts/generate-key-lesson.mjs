import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Original teaching material; no recordings, samples or third-party waveforms.
// Each chord lasts one 4/4 bar at 120 BPM. The four-bar phrase repeats twice.
const rate = 22050, secondsPerChord = 2, duration = 16;
const examples = [
  { id: 'c-major', intendedKey: 'C major', camelot: '8B', names: ['C', 'F', 'G', 'C'], chords: [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]] },
  { id: 'a-minor', intendedKey: 'A minor', camelot: '8A', names: ['Am', 'Dm', 'E', 'Am'], chords: [[45, 48, 52], [50, 53, 57], [52, 56, 59], [45, 48, 52]] },
];
await mkdir('public/audio/key-lesson', { recursive: true });
const manifest = { version: 1, created: '2026-10-31', generator: 'scripts/generate-key-lesson.mjs', sampleRate: rate, encoding: 'mono 16-bit PCM WAV', durationSeconds: duration, tempoBpm: 120, tuning: 'A4 = 440 Hz, 12-tone equal temperament', rights: 'Original BPM Finder teaching examples. You may download and reuse these audio examples.', description: 'Synthesized chords and bass, with a short root pulse on each beat. Chord labels describe the composition; they are not inferred detector results.', examples: [] };
for (const example of examples) {
  const pcm = new Float32Array(rate * duration);
  for (let i = 0; i < pcm.length; i++) {
    const t = i / rate, chordIndex = Math.floor(t / secondsPerChord) % 4;
    const within = t % secondsPerChord, chord = example.chords[chordIndex];
    const envelope = Math.min(1, within / .025, (secondsPerChord - within) / .09);
    let value = 0;
    for (const [index, midi] of chord.entries()) {
      const hz = 440 * 2 ** ((midi - 69) / 12);
      const weight = index === 0 ? .13 : .09;
      value += weight * (Math.sin(2 * Math.PI * hz * t) + .24 * Math.sin(4 * Math.PI * hz * t));
    }
    const rootHz = 440 * 2 ** ((chord[0] - 12 - 69) / 12);
    value += .12 * Math.sin(2 * Math.PI * rootHz * t);
    const pulse = (t % .5);
    value += .08 * Math.sin(2 * Math.PI * rootHz * 4 * t) * Math.exp(-pulse * 14);
    pcm[i] = value * envelope * Math.min(1, t / .025, (duration - t) / .12);
  }
  const wav = Buffer.alloc(44 + pcm.length * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
  wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
  wav.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  const filename = `${example.id}-lesson.wav`;
  await writeFile(`public/audio/key-lesson/${filename}`, wav);
  manifest.examples.push({ ...example, filename, sha256: createHash('sha256').update(wav).digest('hex'), bytes: wav.length });
}
await writeFile('public/audio/key-lesson/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify(manifest, null, 2));
