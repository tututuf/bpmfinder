// Exercise the real Worker wrapper with mocked OpenNext/R2 downstream services.
import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const output = process.env.CHECK_OUTPUT || 'artifacts/geo/edge';
await mkdir(output, { recursive: true });
const bundle = await build({ entryPoints: ['cloudflare/worker.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', plugins: [{
  name: 'geo-downstream-fixtures', setup(b) {
    b.onResolve({ filter: /\.open-next\/worker\.js$/ }, () => ({ path: 'next', namespace: 'geo-fixture' }));
    b.onResolve({ filter: /^\.\/database$/ }, () => ({ path: 'database', namespace: 'geo-fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'geo-fixture' }, ({ path }) => ({ contents: path === 'database' ? 'export class AppDatabase {}' : 'export class DOQueueHandler {} export class DOShardedTagCache {} export class BucketCachePurge {} export default {fetch(request) {return new Response("downstream:"+request.method+":"+new URL(request.url).pathname)}};' }));
  },
}] });
const { default: worker } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const env = { SITE_URL: 'https://bpmfder.com', ANALYSIS_ASSETS: { get() { throw Error('R2 must not be accessed before redirect'); } } };
const report = { checks: [], redirects: [] };
for (const origin of ['http://bpmfder.com', 'http://www.bpmfder.com', 'https://www.bpmfder.com']) {
  for (const path of ['/about?ref=music&v=2', '/images/bpm-finder-social.png', '/models/clap-audio/onnx/audio_model_quantized.onnx', '/google17fab2ec21256fb7.html', '/api/billing/webhook']) {
    const r = await worker.fetch(new Request(origin + path, { method: path.startsWith('/api/') ? 'POST' : 'GET' }), env, {});
    assert.equal(r.status, 308);
    assert.equal(r.headers.get('location'), 'https://bpmfder.com' + path);
    report.redirects.push({ from: origin + path, status: r.status, to: r.headers.get('location') });
  }
}
for (const origin of ['https://bpmfder.com', 'http://127.0.0.1:3002', 'http://localhost:3000', 'https://bpmfinder.example.workers.dev']) {
  const r = await worker.fetch(new Request(origin + '/about', { headers: { 'x-forwarded-proto': 'http', 'x-forwarded-host': 'www.bpmfder.com' } }), env, {});
  assert.equal(r.status, 200);
  assert.equal(await r.text(), 'downstream:GET:/about');
}
const rangeEnv = { ...env, ANALYSIS_ASSETS: { async get(key, options) {
  assert.equal(key, 'models/clap-audio/onnx/audio_model_quantized.onnx');
  assert.equal(options.range.get('range'), 'bytes=1-2');
  return { body: new Uint8Array([2, 3]), httpEtag: '"fixture"', size: 4, range: { offset: 1, length: 2 } };
} } };
for (const method of ['GET', 'HEAD']) {
  const r = await worker.fetch(new Request('https://bpmfder.com/models/clap-audio/onnx/audio_model_quantized.onnx', { method, headers: { range: 'bytes=1-2' } }), rangeEnv, {});
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 1-2/4');
  assert.equal((await r.arrayBuffer()).byteLength, method === 'HEAD' ? 0 : 2);
}
report.checks.push('Actual Worker wrapper returns 308 before downstream services for HTTP/www pages, static files, R2 assets, verification and POST endpoints; path/query preserved', 'Canonical HTTPS, local and workers.dev requests pass through; spoofed forwarding headers do not create a loop', 'Existing R2 GET/HEAD range responses retain content-range and correct bodies');
await writeFile(output + '/report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
