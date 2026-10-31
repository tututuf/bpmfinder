import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

function wrangler(args, quiet = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', ...args], { env: { ...process.env, OPEN_NEXT_DEPLOY: 'true' }, stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let output = '';
    if (quiet) { child.stdout.on('data', chunk => { output += chunk; }); child.stderr.on('data', chunk => { output += chunk; }); }
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Wrangler ${args[0]} failed (${code}). ${output.slice(-1500)}`)));
  });
}
const files = [];
async function visit(folder) {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, item.name);
    if (item.isDirectory()) await visit(path);
    else if (path.endsWith('.cache')) files.push(path);
  }
}
await visit('.open-next/cache');
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < files.length) {
    const file = files[next++];
    const parts = relative('.open-next/cache', file).replaceAll('\\', '/').split('/');
    const buildId = parts.shift();
    const key = '/' + parts.join('/').slice(0, -'.cache'.length);
    const hash = createHash('sha256').update(key).digest('hex');
    await wrangler(['r2', 'object', 'put', `bpmfinder-cache/incremental-cache/${buildId}/${hash}.cache`, '--file', file, '--content-type', 'application/json', '--remote'], true);
    console.log(`Cached ${key}`);
  }
}));
for (const asset of JSON.parse(await readFile('.open-next/large-assets.json', 'utf8'))) {
  await wrangler(['r2', 'object', 'put', `bpmfinder-assets/${asset.key}`, '--file', asset.source, '--content-type', asset.key.endsWith('.wasm') ? 'application/wasm' : 'application/octet-stream', '--remote'], true);
  console.log(`Uploaded ${asset.key}`);
}
await wrangler(['deploy']);
