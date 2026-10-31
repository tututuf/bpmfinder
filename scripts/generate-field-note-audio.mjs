import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

// Original, deterministic educational clicks. No recordings or third-party samples.
const rate = 22050;
const definitions = [
  ...[60,120,180].map(bpm => ({ file: `tempo-${bpm}`, seconds: 8, channels: [{ bpm, offset: 0, frequency: 1000 }] })),
  { file: 'aligned', seconds: 16, channels: [{ bpm: 120, offset: 0, frequency: 750 }, { bpm: 120, offset: 0, frequency: 1150 }] },
  { file: 'fixed-offset', seconds: 16, channels: [{ bpm: 120, offset: 0, frequency: 750 }, { bpm: 120, offset: .1, frequency: 1150 }] },
  { file: 'tempo-drift', seconds: 16, channels: [{ bpm: 120, offset: 0, frequency: 750 }, { bpm: 122, offset: 0, frequency: 1150 }] },
];
await mkdir('public/audio/field-notes', { recursive: true });
const examples = [];
for (const example of definitions) {
  const samples = rate * example.seconds;
  const pcm = new Float64Array(samples * example.channels.length);
  const events = [];
  for (const [channel, config] of example.channels.entries()) {
    const times = [];
    for (let beat = 0; ; beat++) {
      const time = config.offset + beat * 60 / config.bpm;
      if (time >= example.seconds) break;
      const start = Math.round(time * rate);
      times.push(start);
      for (let i = 0; i < rate * .035 && start + i < samples; i++) {
        const t = i / rate;
        // A short smooth onset avoids a discontinuity; both decks use identical envelopes.
        const envelope = Math.min(1, t / .001) * Math.exp(-t * 170);
        pcm[(start + i) * example.channels.length + channel] += .65 * envelope * Math.sin(2 * Math.PI * config.frequency * t);
      }
    }
    events.push({ ...config, startSamples: times });
    for (let i = 1; i < times.length; i++) assert.ok(Math.abs((times[i] - times[0]) / rate - i * 60 / config.bpm) <= 1 / rate);
  }
  const dataSize = pcm.length * 2;
  const wav = Buffer.alloc(44 + dataSize);
  wav.write('RIFF', 0); wav.writeUInt32LE(36 + dataSize,4); wav.write('WAVEfmt ',8); wav.writeUInt32LE(16,16);
  wav.writeUInt16LE(1,20); wav.writeUInt16LE(example.channels.length,22); wav.writeUInt32LE(rate,24);
  wav.writeUInt32LE(rate * example.channels.length * 2,28); wav.writeUInt16LE(example.channels.length * 2,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(dataSize,40);
  for (let i = 0; i < pcm.length; i++) { assert.ok(Math.abs(pcm[i]) < 1); wav.writeInt16LE(Math.round(pcm[i] * 32767),44+i*2); }
  await writeFile(`public/audio/field-notes/${example.file}.wav`,wav);
  assert.equal(wav.readUInt32LE(40) / (2 * example.channels.length * rate), example.seconds);
  examples.push({ filename: `${example.file}.wav`, seconds: example.seconds, sampleRate: rate, channelCount: example.channels.length, events, bytes: wav.length, sha256: createHash('sha256').update(wav).digest('hex') });
}
const changePercent = (120 / 122 - 1) * 100;
const phaseBeatsAfter16Seconds = 16 * (122-120) / 60;
assert.ok(Math.abs(changePercent - (-1.6393442622950838)) < 1e-10);
assert.ok(Math.abs(phaseBeatsAfter16Seconds - 8/15) < 1e-10);
assert.deepEqual(examples[3].events[0].startSamples,examples[3].events[1].startSamples);
assert.ok(examples[4].events[1].startSamples.every((sample,i) => sample-examples[4].events[0].startSamples[i] === 2205));
const manifest = { generated: '2026-10-31', generator: 'scripts/generate-field-note-audio.mjs', format: '16-bit PCM WAV', examples, calculations: { changePercent, phaseBeatsAfter16Seconds } };
await writeFile('public/audio/field-notes/manifest.json',JSON.stringify(manifest,null,2)+'\n');
const notes = `BPM Finder original field-note audio — 2026-10-31
Reproduce from the project root: node scripts/generate-field-note-audio.mjs
All audio is original synthesized sine clicks, with no external samples.
22,050 Hz, 16-bit PCM; sample-rounded click placement error <= 1 sample.
tempo-60/120/180.wav: 8 seconds mono; one click per stated beat. No subdivisions.
aligned/fixed-offset/tempo-drift.wav: 16 seconds stereo. Left = 120 BPM, 750 Hz click; right = 120 or 122 BPM, 1150 Hz click.
Aligned: equal tempo, zero offset. Fixed-offset: equal tempo, right channel 100 ms late.
Tempo-drift: both start at zero; right 122 BPM vs left 120 BPM.
The two stereo channels share one file/playback clock. Headphones reveal separation; both click pitches remain audible in mono.
At 16 seconds the continuous beat-position difference is 16*(122-120)/60 = 0.533333 beats. This is not a count of discrete onsets inside the half-open clip.
To slow 122 BPM to 120 BPM: (120/122-1)*100 = -1.639344 percent.
Assertions check event placement, sample format/duration, absence of clipping, fixed-offset equality and arithmetic. These files are timing demonstrations, not analyzer accuracy tests.
SHA-256:
${examples.map(e => `${e.sha256}  ${e.filename} (${e.seconds}s; ${e.channelCount} channel(s))`).join('\n')}
`;
await writeFile('public/audio/field-notes/verification.txt',notes);
// Read back bytes as a final integrity check, not just the in-memory buffer.
for (const example of examples) assert.equal(createHash('sha256').update(await readFile(`public/audio/field-notes/${example.filename}`)).digest('hex'),example.sha256);
console.log(`Generated and verified ${examples.length} original teaching recordings.`);
