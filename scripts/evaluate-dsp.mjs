import { readFile, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../public/audio-analysis.mjs', import.meta.url), 'utf8');
const pcm = await readFile(new URL('../artifacts/audio-diagnosis/sample-11025.f32', import.meta.url));
const samples = new Float32Array(pcm.buffer.slice(pcm.byteOffset, pcm.byteOffset + pcm.byteLength));
const rows = [];
for (const [hop, size] of [[256,1024], [128,1024], [128,512], [64,1024], [64,512]]) {
  const onsetDeclaration = /const size = 2 \*\* Math\.round\(Math\.log2\(sampleRate \* 512 \/ 11025\)\);\s*const hop = size \/ 4/;
  if (!onsetDeclaration.test(source)) throw new Error('Onset declaration changed; update the diagnostic instrumentation.');
  const experiment = source.replace(onsetDeclaration, `const size = ${size}; const hop = ${hop}`)
    .replace('bpm: best.score >', 'diagnostics: { candidates: candidates.filter((item, i) => i === 0 || Math.abs(item.bpm - 60) < 0.01 || Math.abs(item.bpm - 120) < 0.01), keys: keys.slice(0, 4), chroma: Array.from(chroma) }, bpm: best.score >');
  const { analyzeAudio } = await import(`data:text/javascript;base64,${Buffer.from(experiment).toString('base64')}`);
  for (const seconds of [24, 32.04]) {
    const { waveform, ...result } = analyzeAudio(samples.subarray(0, seconds * 11025), 11025);
    rows.push({ hop, size, seconds, ...result });
  }
}
console.log(JSON.stringify(rows, null, 2));
await writeFile(new URL('../artifacts/audio-diagnosis/dsp-experiments.json', import.meta.url), JSON.stringify(rows, null, 2));
