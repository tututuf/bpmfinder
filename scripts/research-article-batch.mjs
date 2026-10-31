import { mkdir, writeFile } from 'node:fs/promises';
const urls = [
  ['ableton-tempo','https://learningmusic.ableton.com/make-beats/tempo-and-genre.html'],
  ['bbc-tempo','https://www.bbc.co.uk/bitesize/guides/z3rdmnb/revision/1'],
  ['lumen-tempo','https://courses.lumenlearning.com/musicappreciation_with_theory/chapter/tempo/'],
  ['yamaha-tempo','https://hub.yamaha.com/proaudio/recording/what-is-tempo/'],
  ['metronome-terms','https://theonlinemetronome.com/blogs/12/tempo-markings-defined'],
  ['izotope-genre','https://www.izotope.com/en/learn/using-different-tempos-to-make-beats-for-different-genres'],
  ['soundplate-genre','https://soundplate.com/typical-bpm-by-genre-chart/'],
  ['puget-major','https://musictheory.pugetsound.edu/mt21c/MajorKeySignatures.html'],
  ['puget-minor','https://musictheory.pugetsound.edu/mt21c/MinorKeySignatures.html'],
  ['musicnotes-keys','https://www.musicnotes.com/blog/key-signatures/'],
  ['landr-keys','https://blog.landr.com/key-signatures/'],
  ['ni-beatmatch','https://blog.native-instruments.com/beatmatching/'],
  ['pirate-beatmatch','https://pirate.com/en/blog/how-to-beatmatch/'],
  ['djstudio-beatmatch','https://dj.studio/blog/dj-beat-matching-techniques'],
  ['serato-beatmatch','https://support.serato.com/hc/en-us/articles/202523890-Beatmatching'],
];
await mkdir('artifacts/article-batch/research', { recursive: true });
const results = await Promise.allSettled(urls.map(async ([id,url]) => {
  const response = await fetch(url, { signal: AbortSignal.timeout(22000) });
  const html = await response.text();
  const clean = html.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'');
  const main = clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || clean;
  const headings = [...main.matchAll(/<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi)].map(m=>m[2].replace(/<[^>]+>/g,'').trim());
  const text = main.replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&#8217;|&rsquo;/g,"'").replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();
  await writeFile(`artifacts/article-batch/research/${id}.txt`, text);
  return { id, requested:url, url:response.url, status:response.status, headings, chars:text.length, excerpt:text.slice(0,id==='puget-major'||id==='puget-minor'?18000:13000) };
}));
await writeFile('artifacts/article-batch/research/index.json', JSON.stringify(results,null,2));
for(const result of results) console.log(JSON.stringify(result));
