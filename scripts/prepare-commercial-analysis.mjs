import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { CLAP_PROMPTS, CLAP_SCORE_VERSION, CLAP_TEMPERATURE, normalized } from '../public/clap-policy.mjs';

const revision = 'c28f2883575e590e04d3146ff0713c2448d691ba';
const upstreamRevision = '8fa0f1c6d0433df6e97c127f64b2a1d6c0dcda8a';
const modelName = 'Xenova/clap-htsat-unfused';
const cache = '.cache/clap-build';
const model = `${cache}/${modelName}`;
const output = 'public/models/clap-audio';
const records = [];
async function record(file, source) {
  const bytes = await readFile(file);
  records.push({ file, source, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
async function download(url, file) {
  await mkdir(resolve(file, '..'), { recursive: true });
  // Pinned revisions make repeated setup reproducible and allow interrupted retries.
  let exists = false; try { exists = (await stat(file)).size > 0; } catch {}
  if (!exists) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Asset download failed (${response.status}): ${url}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(file, bytes);
  }
  await record(file, url);
}
await mkdir(output, { recursive: true });
await mkdir('public/vendor/commercial', { recursive: true });
const repo = `https://huggingface.co/${modelName}/resolve/${revision}`;
for (const file of ['config.json', 'preprocessor_config.json', 'tokenizer.json', 'tokenizer_config.json', 'special_tokens_map.json', 'onnx/text_model_quantized.onnx', 'onnx/audio_model_quantized.onnx']) {
  await download(`${repo}/${file}`, `${model}/${file}`);
}
for (const file of ['config.json', 'preprocessor_config.json', 'onnx/audio_model_quantized.onnx']) {
  await mkdir(resolve(`${output}/${file}`, '..'), { recursive: true });
  await copyFile(`${model}/${file}`, `${output}/${file}`); await record(`${output}/${file}`, `${repo}/${file}`);
}
for (const [source, target] of [
  ['@huggingface/transformers/dist/transformers.min.js', 'transformers.min.js'],
  ['@huggingface/transformers/LICENSE', 'TRANSFORMERS-LICENSE.txt'],
  ['@huggingface/jinja/LICENSE', 'JINJA-LICENSE.txt'],
  ['@huggingface/tokenizers/LICENSE', 'TOKENIZERS-LICENSE.txt'],
  ['onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.mjs'],
  ['onnxruntime-web/dist/ort-wasm-simd-threaded.jsep.wasm', 'ort-wasm-simd-threaded.jsep.wasm'],
]) { const targetFile = `public/vendor/commercial/${target}`; await copyFile(`node_modules/${source}`, targetFile); await record(targetFile, `npm:${source}`); }
await download('https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a0/LICENSE', 'public/vendor/commercial/ONNX-LICENSE.txt');
await download('https://raw.githubusercontent.com/microsoft/onnxruntime/8d85527a0/ThirdPartyNotices.txt', 'public/vendor/commercial/ONNX-THIRD-PARTY-NOTICES.txt');
await download(`https://huggingface.co/laion/clap-htsat-unfused/raw/${upstreamRevision}/README.md`, `${output}/UPSTREAM-MODEL-CARD.md`);
await download(`https://huggingface.co/Xenova/clap-htsat-unfused/raw/${revision}/README.md`, `${output}/ONNX-MODEL-CARD.md`);
// The HF weight card says Apache-2.0. The LAION source repository separately
// uses CC0; retain both without confusing the code license with weight terms.
await download('https://www.apache.org/licenses/LICENSE-2.0.txt', `${output}/MODEL-LICENSE.txt`);
await download('https://raw.githubusercontent.com/LAION-AI/CLAP/main/LICENSE', `${output}/CLAP-CODE-LICENSE.txt`);

const { AutoTokenizer, ClapTextModelWithProjection, env } = await import('@huggingface/transformers');
env.allowRemoteModels = false; env.localModelPath = resolve(cache) + '/'; env.useFSCache = false;
console.log('Building fixed text prompts with the matching quantized CLAP text encoder…');
const tokenizer = await AutoTokenizer.from_pretrained(modelName);
const textModel = await ClapTextModelWithProjection.from_pretrained(modelName, { dtype: 'q8', device: 'cpu' });
const groups = {};
try {
  for (const [metric, labels] of Object.entries(CLAP_PROMPTS)) {
    groups[metric] = {};
    for (const [side, texts] of Object.entries(labels)) {
      const inputs = await tokenizer(texts, { padding: true, truncation: true });
      const { text_embeds: tensor } = await textModel(inputs);
      if (tensor.dims[0] !== texts.length || tensor.dims[1] !== 512) throw new Error('Unexpected text embedding shape.');
      groups[metric][side] = texts.map((_, i) => normalized(tensor.data.subarray(i * 512, (i + 1) * 512)));
      tensor.dispose(); Object.values(inputs).forEach(t => t.dispose?.());
    }
  }
} finally { await textModel.dispose(); }
await writeFile(`${output}/text-embeddings.json`, JSON.stringify({ version: CLAP_SCORE_VERSION, model: modelName, revision, dimensions: 512, temperature: CLAP_TEMPERATURE, prompts: CLAP_PROMPTS, embeddings: groups }));
await record(`${output}/text-embeddings.json`, 'Generated locally with the pinned CLAP text model; fixed original prompt strings');
await writeFile(`${output}/manifest.json`, JSON.stringify({ engine: 'commercial-clap-2', model: modelName, revision, upstream: 'laion/clap-htsat-unfused', upstreamRevision, license: 'Apache-2.0', runtime: '@huggingface/transformers@4.3.2 / onnxruntime-web (MIT)', score: CLAP_SCORE_VERSION, records }, null, 2));
console.log(JSON.stringify({ complete: true, publicAudioModelMB: Math.round((await stat(`${output}/onnx/audio_model_quantized.onnx`)).size / 1e6 * 10) / 10, publicTextModel: false, records: records.length }));
