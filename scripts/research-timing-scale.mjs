import {mkdir,writeFile} from 'node:fs/promises';
const urls=[
['musical-u-timing','https://www.musical-u.com/learn/how-to-improve-your-rhythm-and-timing/'],
['musicstudio-timing','https://themusicstudio.ca/5-tips-to-develop-your-musical-timing/'],
['justin-metronome','https://www.justinguitar.com/guitar-lessons/how-to-use-a-metronome-b1-403'],
['berklee-metronome','https://online.berklee.edu/takenote/how-to-practice-with-a-metronome/'],
['pianogroove-keys','https://pianogroove.com/jazz-piano-lessons/scales-keys-differences/'],
['ableton-keys','https://learningmusic.ableton.com/notes-and-scales/keys-and-scales.html'],
['ableton-minor','https://learningmusic.ableton.com/notes-and-scales/minor-scales.html'],
['ableton-beat','https://learningmusic.ableton.com/make-beats/beat-and-tempo.html'],
['puget-minor','https://musictheory.pugetsound.edu/mt21c/MinorKeySignatures.html'],
['musicca-keys','https://www.musicca.com/keys']
];
await mkdir('artifacts/timing-scale/research',{recursive:true});
const results=await Promise.allSettled(urls.map(async([id,url])=>{const r=await fetch(url,{signal:AbortSignal.timeout(17000)});const html=await r.text();const clean=html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');const main=clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]||clean;const text=main.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&#8217;|&rsquo;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();const headings=[...main.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>m[2].replace(/<[^>]+>/g,'').trim());await writeFile(`artifacts/timing-scale/research/${id}.txt`,text);return {id,url:r.url,status:r.status,headings,text:text.slice(0,23000)};}));
await writeFile('artifacts/timing-scale/research/index.json',JSON.stringify(results,null,2));for(const r of results)console.log(JSON.stringify(r));
