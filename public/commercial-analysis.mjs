import { analyzeAudio } from './audio-analysis.mjs';
import { signalMetrics } from './analysis-policy.mjs';
import { predictCommercialMood } from './commercial-mood.mjs';
export const ANALYSIS_VERSION = 'commercial-clap-2';

export async function analyzeTrack({ samples, moodSamples, sampleRate = 11025, extended = true, progress = () => {} }) {
  progress('Finding full-track beat & key…');
  const base = analyzeAudio(samples, sampleRate);
  const duration = Math.round(samples.length / sampleRate * 100) / 100;
  const result = { ...base, ...signalMetrics(samples), analysisVersion: ANALYSIS_VERSION, analysisScope: 'full',
    engine: extended ? 'BPM Finder DSP + CLAP' : 'BPM Finder DSP', analysisEngine: 'commercial',
    keyObservations: [], keyStatus: base.key === 'Undetermined' ? 'No key estimate' : 'Local chroma estimate',
    danceability: null, happiness: null, moodStatus: 'Not requested', moodMethod: 'CLAP text-audio match', moodSeconds: 0, warnings: [], analyzedSeconds: duration };
  if (extended) {
    try { Object.assign(result, await predictCommercialMood(moodSamples, progress)); }
    catch { result.moodStatus = 'Unavailable'; result.warnings.push('Additional insights could not run. BPM and key are available; try analyzing this track again.'); }
  }
  return result;
}
