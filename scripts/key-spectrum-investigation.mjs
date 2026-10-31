// Offline diagnostics only. Never used to override a production key.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const source = await readFile(new URL('../public/audio-analysis.mjs', import.meta.url), 'utf8');
const { spectrum, correlation, MAJOR, MINOR, NOTES, analyzeAudio } = await import(`data:text/javascript;base64,${Buffer.from(source + '\nexport { spectrum, correlation, MAJOR, MINOR };').toString('base64')}`);
const rows = [];
for (const rate of [11025, 44100]) {
  const bytes = await readFile(new URL(`../artifacts/audio-diagnosis/sample-${rate}.f32`, import.meta.url));
  const samples = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const size = 2 ** Math.round(Math.log2(rate * 8192 / 11025));
  const chromas = Object.fromEntries(['existing','allPeaks','allBins','power','whitened'].map(name=>[name,new Float64Array(12)]));
  const aggregate = new Float64Array(size/2);
  for (let offset=0;offset+size<samples.length;offset+=size) {
    const bins=spectrum(samples,offset,size);
    for(let b=2;b<bins.length-7;b++) {
      const f=b*rate/size;
      if(f<65||f>2100)continue;
      aggregate[b]+=bins[b];
      const midi=69+12*Math.log2(f/440), note=((Math.round(midi)%12)+12)%12;
      chromas.allBins[note]+=bins[b]; chromas.power[note]+=bins[b]**2;
      let floor=0; for(let n=-6;n<=6;n++)if(Math.abs(n)>1)floor+=bins[b+n]||0;
      chromas.whitened[note]+=bins[b]/Math.max(1e-9,floor/10);
      if(bins[b]<bins[b-1]||bins[b]<=bins[b+1])continue;
      const shift=.5*(bins[b-1]-bins[b+1])/(bins[b-1]-2*bins[b]+bins[b+1]||1);
      const refined=69+12*Math.log2((b+shift)*rate/size/440), refinedNote=((Math.round(refined)%12)+12)%12;
      chromas.allPeaks[refinedNote]+=bins[b];
      if(bins[b]>=2*floor/10&&Math.abs(refined-Math.round(refined))<.35)chromas.existing[refinedNote]+=bins[b];
    }
  }
  const profiles=Object.fromEntries(Object.entries(chromas).map(([name,chroma])=>{
    const keys=[];
    for(let root=0;root<12;root++)for(const [mode,profile] of [['major',MAJOR],['minor',MINOR]])keys.push({key:`${NOTES[root]} ${mode}`,score:correlation(Array.from(chroma),Array.from({length:12},(_,i)=>profile[(i-root+12)%12]))});
    keys.sort((a,b)=>b.score-a.score);
    return[name,{chroma:Array.from(chroma),keys:keys.slice(0,6)}];
  }));
  const peaks=[];
  for(let b=2;b<aggregate.length-1;b++)if(aggregate[b]>aggregate[b-1]&&aggregate[b]>=aggregate[b+1])peaks.push({frequency:b*rate/size,note:NOTES[((Math.round(69+12*Math.log2(b*rate/size/440))%12)+12)%12],magnitude:aggregate[b]});
  peaks.sort((a,b)=>b.magnitude-a.magnitude);
  const base=analyzeAudio(samples,rate);
  rows.push({rate,seconds:samples.length/rate,current:{bpm:base.bpm,key:base.key},peaks:peaks.slice(0,25),profiles});
}
await mkdir(new URL('../artifacts/key-parity/',import.meta.url),{recursive:true});
await writeFile(new URL('../artifacts/key-parity/spectrum.json',import.meta.url),JSON.stringify(rows,null,2));
console.log(JSON.stringify(rows.map(({rate,current,peaks,profiles})=>({rate,current,peaks:peaks.slice(0,8),profiles:Object.fromEntries(Object.entries(profiles).map(([name,p])=>[name,p.keys.slice(0,3)]))})),null,2));
