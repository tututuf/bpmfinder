import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

// Download this script, manifest.json and the three example WAV files into one folder.
// Run with Node.js: node verify-dj-mistakes.mjs
const audioRoot = new URL('./', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', audioRoot), 'utf8'));
const results = [];
for (const name of ['aligned', 'fixed-offset', 'tempo-drift']) {
  const filename = `${name}.wav`;
  const bytes = await readFile(new URL(filename, audioRoot));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE');
  let format, data;
  for (let pos = 12; pos + 8 <= bytes.length;) {
    const id = bytes.toString('ascii', pos, pos + 4);
    const size = bytes.readUInt32LE(pos + 4);
    assert.ok(pos + 8 + size <= bytes.length);
    if (id === 'fmt ') format = bytes.subarray(pos + 8, pos + 8 + size);
    if (id === 'data') data = bytes.subarray(pos + 8, pos + 8 + size);
    pos += 8 + size + (size % 2);
  }
  assert.ok(format && data);
  assert.equal(format.readUInt16LE(0), 1); // PCM
  assert.equal(format.readUInt16LE(2), 2); // stereo
  assert.equal(format.readUInt16LE(14), 16);
  const sampleRate = format.readUInt32LE(4);
  assert.equal(sampleRate, 22050);
  const frames = data.length / 4;
  const starts = [[], []];
  for (let channel = 0; channel < 2; channel++) {
    let last = -Infinity;
    for (let frame = 0; frame < frames; frame++) {
      // A 100 ms refractory window exceeds each isolated 35 ms click.
      if (frame - last < sampleRate * 0.1) continue;
      if (Math.abs(data.readInt16LE(frame * 4 + channel * 2)) < 32) continue;
      starts[channel].push(frame);
      last = frame;
    }
  }
  const channels = starts.map(events => ({
    onsetSamples: events,
    count: events.length,
    meanIntervalMs: (events.at(-1) - events[0]) * 1000 / sampleRate / (events.length - 1),
    measuredBpm: 60 * sampleRate * (events.length - 1) / (events.at(-1) - events[0]),
  }));
  const pairedOffsetsMs = starts[0].map((sample, i) => (starts[1][i] - sample) * 1000 / sampleRate);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const generated = manifest.examples.find(item => item.filename === filename);
  assert.equal(sha256, generated.sha256);
  // Validate the reported detector delay against the original event positions.
  for (let channel = 0; channel < 2; channel++) {
    assert.deepEqual(starts[channel], generated.events[channel].startSamples.map(sample => sample + 1));
  }
  assert.equal(channels[0].count, 32);
  assert.equal(channels[1].count, name === 'tempo-drift' ? 33 : 32);
  assert.ok(Math.abs(channels[0].measuredBpm - 120) < 0.001);
  assert.ok(Math.abs(channels[1].measuredBpm - (name === 'tempo-drift' ? 122 : 120)) < 0.001);
  if (name !== 'tempo-drift') assert.ok(pairedOffsetsMs.every(ms => Math.abs(ms - (name === 'fixed-offset' ? 100 : 0)) < 1e-9));
  else assert.ok(pairedOffsetsMs.every((ms, i) => Math.abs(ms - i * (60 / 122 - 60 / 120) * 1000) <= 1000 / sampleRate));
  results.push({ filename, sha256, sampleRate, seconds: frames / sampleRate, channels, pairedOffsetsMs });
}
const report = {
  checked: '2026-11-06',
  method: 'Read 16-bit PCM. Detect abs(sample) >= 32 with a 100 ms refractory window per channel. Estimate BPM from first-to-last onset spacing; compare same-index onsets. Detection is one sample after the generator event in these files; that constant delay cancels in intervals and paired offsets.',
  timingResolutionMs: 1000 / 22050,
  scope: 'Controlled synthesized clicks only. No hardware, live set, analyzer accuracy or practice-effectiveness test.',
  results,
  calculationsNotMeasurements: { slow122To120Percent: (120 / 122 - 1) * 100, continuousPhaseDifferenceAt16SecondsBeats: 16 * (122 - 120) / 60 },
};
const destination = new URL('AUDIO-EVIDENCE.json', import.meta.url);
await writeFile(destination, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: fileURLToPath(destination), examples: results.map(r => ({ file: r.filename, bpm: r.channels.map(c => c.measuredBpm), counts: r.channels.map(c => c.count), firstOffsetMs: r.pairedOffsetsMs[0], offsetAtIndex16Ms: r.pairedOffsetsMs[16], lastPairedOffsetMs: r.pairedOffsetsMs.at(-1) })) }, null, 2));
