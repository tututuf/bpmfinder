import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { inflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const records = [];
async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(new URL('.', new URL(destination, root)), { recursive: true });
  await writeFile(new URL(destination, root), bytes);
  records.push({ source: url, file: destination, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
  return bytes;
}
await mkdir(new URL('backups/legacy-analysis/vendor/', root), { recursive: true });
for (const [source, destination] of [
  ['essentia.js/dist/essentia-wasm.es.js', 'essentia-wasm.es.js'],
  ['essentia.js/dist/essentia.js-core.es.min.js', 'essentia-core.es.js'],
  ['essentia.js/LICENSE', 'ESSENTIA-LICENSE.txt'],
  ['@tensorflow/tfjs/dist/tf.min.js', 'tf.min.js'],
  ['@tensorflow/tfjs/dist/tf.min.js.map', 'tf.min.js.map'],
  ['@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js', 'tf-backend-wasm.min.js'],
  ['@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.min.js.map', 'tf-backend-wasm.min.js.map'],
  ['@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm', 'tfjs-backend-wasm.wasm'],
  ['@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm', 'tfjs-backend-wasm-simd.wasm'],
  ['@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm', 'tfjs-backend-wasm-threaded-simd.wasm'],
]) await copyFile(new URL(`node_modules/${source}`, root), new URL(`backups/legacy-analysis/vendor/${destination}`, root));

await mkdir(new URL('backups/legacy-analysis/models/musicnn/', root), { recursive: true });
const zip = await download('https://essentia.upf.edu/models/feature-extractors/musicnn/msd-musicnn-1-tfjs.zip', 'artifacts/engine-research/musicnn.zip');
// This upstream archive has stale filename lengths/offsets. Locate its timestamp extra
// header to recover only the two known files; never extract its embedded filesystem paths.
let offset = 0;
const found = new Set();
while (offset + 30 < zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
  const endName = zip.indexOf(Buffer.from([0x55, 0x54, 9, 0]), offset + 30);
  if (endName < offset + 30 || endName > offset + 512) throw new Error('Unexpected musicnn archive layout.');
  const name = zip.subarray(offset + 30, endName).toString().split('/').at(-1);
  const start = endName + zip.readUInt16LE(offset + 28), length = zip.readUInt32LE(offset + 18);
  if (name === 'model.json' || name === 'group1-shard1of1.bin') {
    const bytes = inflateRawSync(zip.subarray(start, start + length));
    const file = `backups/legacy-analysis/models/musicnn/${name}`;
    await writeFile(new URL(file, root), bytes);
    records.push({ source: 'musicnn archive', file, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
    found.add(name);
  }
  offset = start + length;
}
if (found.size !== 2) throw new Error('Missing musicnn assets.');
for (const name of ['danceability', 'mood_happy']) {
  const base = `https://essentia.upf.edu/models/classification-heads/${name}/${name}-msd-musicnn-1-tfjs/`;
  for (const file of ['model.json', 'group1-shard1of1.bin']) await download(`${base}${file}`, `backups/legacy-analysis/models/${name}/${file}`);
  await download(`https://essentia.upf.edu/models/classification-heads/${name}/${name}-msd-musicnn-1.json`, `backups/legacy-analysis/models/${name}/metadata.json`);
}
await download('https://essentia.upf.edu/models/feature-extractors/musicnn/msd-musicnn-1.json', 'backups/legacy-analysis/models/musicnn/metadata.json');
await download('https://raw.githubusercontent.com/tensorflow/tfjs/tfjs-v4.22.0/LICENSE', 'backups/legacy-analysis/vendor/TENSORFLOW-LICENSE.txt');
const licensePage = await download('https://essentia.upf.edu/licensing_information.html', 'artifacts/engine-research/licensing.html');
await writeFile(new URL('backups/legacy-analysis/models/manifest.json', root), JSON.stringify({ date: '2026-10-28', essentia: '0.1.3', tensorflow: '4.22.0', license: 'Pretrained models: CC BY-NC-ND 4.0; commercial licensing available from UPF.', records }, null, 2));
JSON.parse(await readFile(new URL('backups/legacy-analysis/models/musicnn/model.json', root)));
console.log(`Prepared local runtime and ${records.length} provenance records (${licensePage.length} licensing-page bytes).`);
