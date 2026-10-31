import { analyzeTrack } from './commercial-analysis.mjs';
import { resultForAccess } from './analysis-access.mjs';
self.onmessage = async ({ data }) => {
  try { self.postMessage({ result: resultForAccess(await analyzeTrack({ ...data, extended: data.premium === true && data.extended === true, samples: new Float32Array(data.samples), tonalSamples: new Float32Array(data.tonalSamples), moodSamples: new Float32Array(data.moodSamples), progress: message => self.postMessage({ progress: message }) }), data.premium === true) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : 'Analysis failed. Try another file.' }); }
};
