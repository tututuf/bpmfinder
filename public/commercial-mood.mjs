import { CLAP_WINDOW_SAMPLES, CLAP_SAMPLE_RATE, CLAP_SCORE_VERSION, fullTrackWindows, scoreEmbedding } from './clap-policy.mjs';
let pending;
async function load(progress) {
  if (!pending) pending = (async () => {
    progress('Loading local insight model · first use may take a moment…');
    const { env, AutoProcessor, ClapAudioModelWithProjection } = await import('./vendor/commercial/transformers.min.js');
    env.allowRemoteModels = false;
    env.allowLocalModels = true;
    env.localModelPath = '/models/';
    env.useBrowserCache = true;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
    env.backends.onnx.wasm.wasmPaths = { mjs: new URL('./vendor/commercial/ort-wasm-simd-threaded.jsep.mjs', import.meta.url).href, wasm: new URL('./vendor/commercial/ort-wasm-simd-threaded.jsep.wasm', import.meta.url).href };
    const response = await fetch('/models/clap-audio/text-embeddings.json');
    if (!response.ok) throw new Error('CLAP prompts unavailable.');
    const prompts = await response.json();
    if (prompts.version !== CLAP_SCORE_VERSION || prompts.dimensions !== 512) throw new Error('CLAP prompt version mismatch.');
    const processor = await AutoProcessor.from_pretrained('clap-audio', { local_files_only: true });
    const model = await ClapAudioModelWithProjection.from_pretrained('clap-audio', { dtype: 'q8', device: 'wasm', local_files_only: true });
    return { model, processor, prompts: prompts.embeddings };
  })().catch(error => { pending = null; throw error; });
  return pending;
}
export async function predictCommercialMood(samples, progress = () => {}) {
  if (!(samples instanceof Float32Array) || samples.length < CLAP_SAMPLE_RATE * 3) throw new Error('Insight analysis needs at least three seconds of audio.');
  const { model, processor, prompts } = await load(progress);
  const windows = fullTrackWindows(samples.length);
  const totals = { danceability: 0, happiness: 0 };
  let validWeight = 0;
  for (const [index, window] of windows.entries()) {
    progress(`Analyzing full-track insights · window ${index + 1}/${windows.length}`);
    const original = samples.subarray(window.start, window.start + window.length);
    // Always feed exactly ten seconds: avoid the processor's random crop and
    // use deterministic repeat-padding only for genuinely short recordings.
    const audio = new Float32Array(CLAP_WINDOW_SAMPLES);
    for (let offset = 0; offset < audio.length; offset += original.length) audio.set(original.subarray(0, Math.min(original.length, audio.length - offset)), offset);
    let square = 0; for (const sample of original) square += sample * sample;
    // Silent stretches have duration but carry no evidence of happiness/dance.
    if (Math.sqrt(square / original.length) < 0.0001) continue;
    let input, output;
    try {
      input = await processor(audio);
      output = await model(input);
      const embedding = output.audio_embeds;
      if (embedding.dims.at(-1) !== 512 || embedding.data.length !== 512) throw new Error('Unexpected CLAP audio embedding.');
      const scores = scoreEmbedding(embedding.data, prompts);
      for (const name of Object.keys(totals)) totals[name] += scores[name] * window.weight;
      validWeight += window.weight;
    } finally {
      for (const tensor of Object.values(input || {})) tensor.dispose?.();
      for (const tensor of Object.values(output || {})) tensor.dispose?.();
    }
  }
  return { danceability: validWeight ? Math.round(totals.danceability / validWeight) : null,
    happiness: validWeight ? Math.round(totals.happiness / validWeight) : null,
    moodStatus: validWeight ? 'Text-audio match estimate' : 'No audible music', moodMethod: 'CLAP text-audio match', moodBackend: 'ONNX WASM',
    moodPatches: windows.length, moodSeconds: Math.round(samples.length / CLAP_SAMPLE_RATE * 100) / 100 };
}
