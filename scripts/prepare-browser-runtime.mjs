import { mkdir, copyFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Reproduce the unmodified npm distribution instead of committing its bundle.
// GitHub push protection misidentifies model class names in its minified exports.
const source = 'node_modules/@huggingface/transformers/dist/transformers.min.js';
const destination = 'public/vendor/commercial/transformers.min.js';
const manifest = JSON.parse(await readFile('public/models/clap-audio/manifest.json', 'utf8'));
const record = manifest.records.find(item => item.file === destination);
const bytes = await readFile(source);
if (!record || createHash('sha256').update(bytes).digest('hex') !== record.sha256) {
  throw new Error('Transformers.js does not match the recorded analysis runtime. Install the locked dependencies.');
}
await mkdir('public/vendor/commercial', { recursive: true });
await copyFile(source, destination);
console.log('Prepared the verified Transformers.js browser runtime.');
