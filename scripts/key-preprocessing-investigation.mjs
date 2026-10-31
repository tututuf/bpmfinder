import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const file=process.argv[2];
if(!file)throw new Error('Supply original MP3 path');
const bytes=await readFile(file);
const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try{
  const page=await browser.newPage();
  await page.goto('http://127.0.0.1:3000');
  const report=await page.evaluate(async base64=>{
    const {analyzeAudio}=await import('/audio-analysis.mjs');
    const context=new AudioContext();
    const decoded=await context.decodeAudioData(Uint8Array.from(atob(base64),c=>c.charCodeAt(0)).buffer);
    const rows=[];
    for(const rate of [11025,22050,44100]){
      const offline=new OfflineAudioContext(1,Math.ceil(decoded.duration*rate),rate);
      const source=offline.createBufferSource();source.buffer=decoded;source.connect(offline.destination);source.start();
      const samples=(await offline.startRendering()).getChannelData(0);
      const summarize=audio=>{const r=analyzeAudio(audio,rate);return{bpm:r.bpm,key:r.key,candidates:r.keyCandidates};};
      const padded=new Float32Array(samples.length+Math.round(rate*.1));padded.set(samples,Math.round(rate*.1));
      const variants={full:summarize(samples),quiet:summarize(samples.map(v=>v*.1)),trimmed:summarize(samples.slice(Math.round(rate*.1))),padded:summarize(padded)};
      const segments=[];
      for(let i=0;i<3;i++)segments.push(summarize(samples.slice(i*rate*10,(i+1)*rate*10)));
      rows.push({rate,seconds:samples.length/rate,variants,segments});
    }
    await context.close();
    return{decodeRate:decoded.sampleRate,duration:decoded.duration,channels:decoded.numberOfChannels,rows};
  },bytes.toString('base64'));
  const output={sha256:createHash('sha256').update(bytes).digest('hex'),...report};
  await mkdir(new URL('../artifacts/key-parity/',import.meta.url),{recursive:true});
  await writeFile(new URL('../artifacts/key-parity/preprocessing.json',import.meta.url),JSON.stringify(output,null,2));
  console.log(JSON.stringify(output,null,2));
}finally{await browser.close();}
