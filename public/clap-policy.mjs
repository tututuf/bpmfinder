export const CLAP_SAMPLE_RATE = 48000;
export const CLAP_WINDOW_SAMPLES = CLAP_SAMPLE_RATE * 10;
export const CLAP_SCORE_VERSION = 'clap-prompt-pairs-1';
export const CLAP_TEMPERATURE = 0.07;
// Balanced prompt ensembles. Scores are relative audio/text matches, not
// calibrated emotion probabilities or equivalents of the legacy MTG heads.
export const CLAP_PROMPTS = {
  danceability: {
    positive: ['This music has a danceable groove.', 'This music has a steady beat that is easy to dance to.', 'This is rhythmic music for dancing.', 'This music has an infectious dance rhythm.'],
    negative: ['This music is not danceable.', 'This music has no steady dance rhythm.', 'This is free-form music without a regular beat.', 'This music is difficult to dance to.'],
  },
  happiness: {
    positive: ['This music sounds happy and cheerful.', 'This music has a joyful and uplifting mood.', 'This music sounds bright and optimistic.', 'This music expresses happiness and delight.'],
    negative: ['This music sounds sad and sorrowful.', 'This music has a gloomy and melancholy mood.', 'This music sounds somber and mournful.', 'This music expresses sadness and grief.'],
  },
};

export function fullTrackWindows(length, size = CLAP_WINDOW_SAMPLES) {
  if (!Number.isSafeInteger(length) || length <= 0 || !Number.isSafeInteger(size) || size <= 0) return [];
  const windows = [];
  for (let offset = 0; offset < length; offset += size) windows.push({ start: Math.max(0, Math.min(offset, length - size)), length: Math.min(size, length), weight: Math.min(size, length - offset) });
  return windows;
}
export function normalized(vector) {
  if (!vector?.length || Array.from(vector).some(v => !Number.isFinite(v))) throw new Error('Invalid CLAP embedding.');
  const norm = Math.hypot(...vector);
  if (norm < 1e-12) throw new Error('Empty CLAP embedding.');
  return Array.from(vector, value => value / norm);
}
export function scoreEmbedding(audio, prompts) {
  const vector = normalized(audio);
  const similarity = reference => {
    if (reference.length !== vector.length) throw new Error('Mismatched CLAP embeddings.');
    const text = normalized(reference);
    return vector.reduce((sum, value, i) => sum + value * text[i], 0);
  };
  const mean = list => {
    if (!Array.isArray(list) || !list.length) throw new Error('Missing CLAP prompt embeddings.');
    return list.reduce((sum, value) => sum + similarity(value), 0) / list.length;
  };
  return Object.fromEntries(['danceability', 'happiness'].map(name => {
    const group = prompts[name];
    if (!group) throw new Error('Missing CLAP prompt group.');
    const difference = (mean(group.positive) - mean(group.negative)) / CLAP_TEMPERATURE;
    return [name, 100 / (1 + Math.exp(-difference))];
  }));
}
