import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const rate = 22050, seconds = 16, bpm = 120, beatSeconds = 60 / bpm;
const folder = 'public/audio/timing-scale';
await mkdir(folder, { recursive: true });
const examples = [];

async function save(file, pcm, details) {
  const wav = Buffer.alloc(44 + pcm.length * 2);
  wav.write('RIFF',0); wav.writeUInt32LE(wav.length-8,4); wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16); wav.writeUInt16LE(1,20); wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(rate,24); wav.writeUInt32LE(rate*2,28); wav.writeUInt16LE(2,32); wav.writeUInt16LE(16,34);
  wav.write('data',36); wav.writeUInt32LE(pcm.length*2,40);
  let peak = 0;
  for (let i=0;i<pcm.length;i++) { peak=Math.max(peak,Math.abs(pcm[i])); assert.ok(Math.abs(pcm[i]) < 1,`${file} must not clip`); wav.writeInt16LE(Math.round(pcm[i]*32767),44+i*2); }
  const filename = `${file}.wav`;
  await writeFile(`${folder}/${filename}`,wav);
  assert.equal(wav.readUInt32LE(40)/rate/2,seconds);
  const hash = createHash('sha256').update(wav).digest('hex');
  assert.equal(createHash('sha256').update(await readFile(`${folder}/${filename}`)).digest('hex'),hash);
  examples.push({ filename, seconds, sampleRate: rate, channelCount: 1, bytes:wav.length, sha256:hash, peak, ...details });
}

for (const pattern of ['every-beat','half-clicks','silent-bars']) {
  const pcm = new Float64Array(rate*seconds), events=[];
  for(let beat=0;beat<32;beat++) {
    const bar = Math.floor(beat/4)+1, beatInBar=beat%4+1;
    if(pattern==='half-clicks'&&beat%2!==0)continue;
    if(pattern==='silent-bars'&&[3,7].includes(bar))continue;
    const start = Math.round(beat*beatSeconds*rate);
    events.push({bar,beat:beatInBar,startSample:start,timeSeconds:beat*beatSeconds});
    const frequency=beatInBar===1?1250:850;
    for(let j=0;j<rate*.04&&start+j<pcm.length;j++) {
      const t=j/rate, envelope=Math.min(1,t/.001)*Math.exp(-t*150);
      pcm[start+j]+=.6*envelope*Math.sin(2*Math.PI*frequency*t);
    }
  }
  assert.equal(events.length,pattern==='every-beat'?32:pattern==='half-clicks'?16:24);
  if(pattern==='half-clicks')assert.ok(events.every(e=>[1,3].includes(e.beat)));
  if(pattern==='silent-bars') {
    for(const bar of [3,7]) {
      const samples=pcm.subarray((bar-1)*2*rate,bar*2*rate);
      assert.ok(samples.every(v=>v===0),'Every sample in the omitted bar is silent');
    }
    for(const bar of [4,8])assert.ok(events.some(e=>e.bar===bar&&e.beat===1),'Click returns on the expected downbeat');
  }
  assert.ok(events.every(e=>Math.abs(e.startSample/rate-e.timeSeconds)<=1/rate));
  await save(pattern,pcm,{kind:'timing',bpm,beatsPerBar:4,bars:8,events});
}

const melody = Array.from({length:32},(_,i)=>[72,74,76,79,81,83,79,76][i%8]);
const definitions=[
  { file:'center-c-major',intendedCenter:'C major',chordNames:['C','F','G','C'],chords:[[48,52,55],[53,57,60],[55,59,62],[48,52,55]],melody },
  { file:'center-a-minor',intendedCenter:'A minor',chordNames:['Am','Dm','Em','Am'],chords:[[45,48,52],[50,53,57],[52,55,59],[45,48,52]],melody },
  { file:'parallel-c-minor',intendedCenter:'C minor',chordNames:['Cm','Fm','Gm','Cm'],chords:[[48,51,55],[53,56,60],[55,58,62],[48,51,55]],melody:melody.map(m=>[4,9,11].includes(m%12)?m-1:m) },
];
const pitchClasses=d=>[...new Set([...d.chords.flat(),...d.melody].map(m=>m%12))].sort((a,b)=>a-b);
assert.deepEqual(definitions[0].melody,definitions[1].melody,'Relative comparison uses the exact same melody');
assert.deepEqual(pitchClasses(definitions[0]),[0,2,4,5,7,9,11]);
assert.deepEqual(pitchClasses(definitions[0]),pitchClasses(definitions[1]));
assert.deepEqual(pitchClasses(definitions[2]),[0,2,3,5,7,8,10]);
assert.equal(definitions[0].chords.at(-1)[0],definitions[2].chords.at(-1)[0],'Parallel comparison retains tonic C');
for(const def of definitions) {
  const pcm=new Float64Array(rate*seconds);
  for(let i=0;i<pcm.length;i++) {
    const t=i/rate,bar=Math.floor(t/2),chord=def.chords[bar%4],within=t%2;
    const chordEnvelope=Math.max(0,Math.min(1,within/.02,(2-within)/.07));
    let value=0;
    for(const midi of chord) {
      const hz=440*2**((midi-69)/12);
      value+=.07*(Math.sin(2*Math.PI*hz*t)+.17*Math.sin(4*Math.PI*hz*t))*chordEnvelope;
    }
    const bass=440*2**((chord[0]-12-69)/12);
    value+=.13*Math.sin(2*Math.PI*bass*t)*chordEnvelope;
    const beat=Math.floor(t/beatSeconds),local=t%beatSeconds;
    const noteEnvelope=Math.max(0,Math.min(1,local/.012,(.46-local)/.07));
    const noteHz=440*2**((def.melody[beat]-69)/12);
    value+=.12*(Math.sin(2*Math.PI*noteHz*local)+.12*Math.sin(4*Math.PI*noteHz*local))*noteEnvelope;
    pcm[i]=value*Math.max(0,Math.min(1,(seconds-t)/.08));
  }
  await save(def.file,pcm,{kind:'harmony',bpm,intendedCenter:def.intendedCenter,chordNames:def.chordNames,sequence:'Four chords, one every two seconds, played twice',chordMidi:def.chords,melodyMidi:def.melody,pitchClasses:pitchClasses(def),tuning:'A4=440 Hz, 12-tone equal temperament'});
}
const manifest={generated:'2026-11-01',generator:'scripts/generate-timing-scale-audio.mjs',rights:'Original BPM Finder educational audio. You may download and reuse these examples.',examples};
await writeFile(`${folder}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
await writeFile(`${folder}/verification.txt`,`BPM Finder original timing and scale examples — November 1, 2026
Reproduce: node scripts/generate-timing-scale-audio.mjs
All six files: 16 seconds, mono, 22,050 Hz, 16-bit PCM WAV. No third-party recordings or samples.
Timing files: underlying quarter-note pulse 120 BPM, eight 4/4 bars, two seconds per bar.
every-beat: all 32 beats audible. half-clicks: 16 clicks, beats 1 and 3 only; underlying pulse remains 120.
silent-bars: bars 3 and 7 omitted (4–6s and 12–14s); clicks return on bars 4 and 8 (6s and 14s). Every sample in omitted bars verified zero. These are designed practice exercises, not measured proof of training efficacy.
Harmony files: two four-bar phrases at 120 BPM, one chord per bar.
center-c-major: C–F–G–C; center-a-minor: Am–Dm–Em–Am. Exact same 32-note melody in both; both use only pitch classes C D E F G A B. The A-minor example deliberately uses Em, not E major, to keep the shared natural-note collection.
parallel-c-minor: Cm–Fm–Gm–Cm; the melody lowers E/A/B to E-flat/A-flat/B-flat. Tonic C retained; collection changes.
Bass/chord context is the controlled difference in the relative pair. Intended centers describe the authored harmony, not observed analyzer outputs or guaranteed listener responses. These clips are not an analyzer benchmark.
Generator assertions: no clipping, format/duration, read-back hash, click counts/positions, actual silent samples, expected return positions, identical relative-pair melody, equal relative pitch-class sets and correct parallel-minor set.
SHA-256:
${examples.map(e=>`${e.sha256}  ${e.filename}`).join('\n')}
`);
console.log(`Generated and verified ${examples.length} original 16-second audio examples.`);
