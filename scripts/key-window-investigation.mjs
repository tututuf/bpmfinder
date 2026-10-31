// Compare general preprocessing alternatives without assuming a target key.
import { readFile, writeFile } from 'node:fs/promises';
const source=await readFile(new URL('../public/audio-analysis.mjs',import.meta.url),'utf8');
const rows=[];
for(const overlap of [1,4,8])for(const soft of [false,true]){
  let code=source.replace('offset += fftSize)',`offset += fftSize / ${overlap})`);
  if(soft)code=code.replace('if (Math.abs(midi - Math.round(midi)) < 0.35) chroma[((Math.round(midi) % 12) + 12) % 12] += bins[b];','const distance = Math.abs(midi - Math.round(midi)); chroma[((Math.round(midi) % 12) + 12) % 12] += bins[b] * Math.cos(Math.PI * distance) ** 2;');
  const {analyzeAudio}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const results=[];
  for(const rate of [11025,44100]){
    const b=await readFile(new URL(`../artifacts/audio-diagnosis/sample-${rate}.f32`,import.meta.url));
    const s=new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
    const keys=[];
    for(const shift of [0,.05,.1,.2]){
      const samples=new Float32Array(s.length+Math.round(rate*shift));samples.set(s,Math.round(rate*shift));
      const r=analyzeAudio(samples,rate);keys.push({silencePrefix:shift,key:r.key,score:r.keyCandidates[0]?.strength});
    }
    results.push({rate,keys});
  }
  rows.push({overlap,soft,results});
}
await writeFile(new URL('../artifacts/key-parity/window-experiments.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(x=>({...x,results:x.results.map(r=>({rate:r.rate,keys:r.keys.map(k=>k.key)}))})),null,2));
