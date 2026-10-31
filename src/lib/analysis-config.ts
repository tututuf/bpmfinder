export type AnalysisEngine = 'commercial' | 'legacy';
export function analysisConfiguration(environment: Record<string, string | undefined> = process.env) {
  const legacy = environment.ANALYSIS_ENGINE === 'legacy';
  if (legacy && environment.NODE_ENV === 'production' && environment.COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED !== 'true') throw new Error('Legacy analysis requires confirmed commercial permissions in production.');
  return { engine: legacy ? 'legacy' as const : 'commercial' as const, version: legacy ? 'essentia-5-estimate' : 'commercial-clap-2', moodSampleRate: legacy ? 16000 : 48000,
    workerUrl: legacy ? '/api/analysis/legacy/analysis-worker.mjs' : '/analysis-worker.mjs?v=commercial-clap-2' };
}
export function legacyAssetsAllowed(environment: Record<string, string | undefined> = process.env) {
  return environment.ANALYSIS_ENGINE === 'legacy' && (environment.NODE_ENV !== 'production' || environment.COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED === 'true');
}
