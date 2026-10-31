// Original, dependency-free prototype DSP. Results are estimates, not calibrated confidence scores.
export const ANALYSIS_VERSION = 'dsp-3';
export const NOTES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
const MAJOR_CAMELOT = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1];
const MINOR_CAMELOT = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];

function spectrum(input, start, size) {
  const re = new Float64Array(size), im = new Float64Array(size);
  for (let i = 0; i < size; i++) re[i] = (input[start + i] || 0) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (size - 1)));
  for (let i = 1, j = 0; i < size; i++) {
    let bit = size >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [re[i], re[j]] = [re[j], re[i]];
  }
  for (let len = 2; len <= size; len <<= 1) {
    const angle = -2 * Math.PI / len, cr = Math.cos(angle), ci = Math.sin(angle);
    for (let i = 0; i < size; i += len) {
      let wr = 1, wi = 0;
      for (let j = 0; j < len / 2; j++) {
        const a = i + j, b = a + len / 2;
        const tr = re[b] * wr - im[b] * wi, ti = re[b] * wi + im[b] * wr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const nr = wr * cr - wi * ci; wi = wr * ci + wi * cr; wr = nr;
      }
    }
  }
  return Float64Array.from(re.subarray(0, size / 2), (r, i) => Math.hypot(r, im[i]));
}

function correlation(a, b) {
  const am = a.reduce((x, y) => x + y, 0) / a.length, bm = b.reduce((x, y) => x + y, 0) / b.length;
  let sum = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] - am, y = b[i] - bm; sum += x * y; aa += x * x; bb += y * y; }
  return sum / Math.sqrt(aa * bb || 1);
}

export function analyzeAudio(samples, sampleRate = 11025) {
  if (samples.length < sampleRate * 3) throw new Error('Choose a track at least 3 seconds long.');
  let energy = 0;
  for (const v of samples) energy += v * v;
  if (Math.sqrt(energy / samples.length) < 0.0001) throw new Error('This file is silent. Try a track with audible music.');
  // Keep the onset window near 46 ms and hop near 12 ms at every sample rate.
  // A 93 ms window smeared drum transients and favored a repeating two-beat accent (half tempo).
  const size = 2 ** Math.round(Math.log2(sampleRate * 512 / 11025));
  const hop = size / 4, envelope = [], previous = new Float64Array(size / 2);
  // Compare the same frequency band and FFT magnitude scale across input rates.
  const onsetBins = Math.min(size / 2, Math.ceil(5500 * size / sampleRate));
  for (let offset = 0; offset + size < samples.length; offset += hop) {
    const bins = spectrum(samples, offset, size);
    let flux = 0;
    for (let b = 3; b < onsetBins; b++) {
      const v = Math.log1p(bins[b] * 10 * 512 / size);
      flux += Math.max(0, v - previous[b]); previous[b] = v;
    }
    envelope.push(flux);
  }
  const onset = envelope.map((v, i) => {
    const lo = Math.max(0, i - 8), hi = Math.min(envelope.length, i + 9);
    let mean = 0; for (let j = lo; j < hi; j++) mean += envelope[j];
    return Math.max(0, v - mean / (hi - lo));
  });
  const ac = lag => {
    const whole = Math.floor(lag), fraction = lag - whole;
    let score = 0, normA = 0, normB = 0;
    for (let i = Math.ceil(lag); i < onset.length; i++) {
      const before = onset[i - whole] * (1 - fraction) + (onset[i - whole - 1] || 0) * fraction;
      score += onset[i] * before; normA += onset[i] ** 2; normB += before ** 2;
    }
    return score / Math.sqrt(normA * normB || 1);
  };
  const candidates = [];
  for (let bpm = 60; bpm <= 200; bpm += 0.25) {
    const lag = 60 * sampleRate / (hop * bpm);
    const score = ac(lag) + 0.45 * ac(lag * 2) + 0.2 * ac(lag * 3);
    candidates.push({ bpm, score: score * (0.75 + 0.25 * Math.exp(-(((bpm - 120) / 45) ** 2))) });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  const chroma = new Float64Array(12);
  let flatnessTotal = 0, spectralWeight = 0;
  const fftSize = 2 ** Math.round(Math.log2(sampleRate * 8192 / 11025));
  for (let offset = 0; offset + fftSize < samples.length; offset += fftSize) {
    const bins = spectrum(samples, offset, fftSize);
    // Reject broadband noise using the spectrum itself. Key-profile ambiguity
    // is not a reason to discard an otherwise usable ranked estimate.
    let logPower = 0, bandPower = 0, bandBins = 0;
    for (let b = Math.ceil(65 * fftSize / sampleRate); b <= Math.min(bins.length - 1, Math.floor(2100 * fftSize / sampleRate)); b++) {
      const power = bins[b] ** 2;
      logPower += Math.log(Math.max(1e-20, power)); bandPower += power; bandBins++;
    }
    if (bandPower > 0 && bandBins > 0) {
      flatnessTotal += Math.exp(logPower / bandBins) / (bandPower / bandBins) * bandPower;
      spectralWeight += bandPower;
    }
    for (let b = 2; b < bins.length - 1; b++) {
      const frequency = b * sampleRate / fftSize;
      if (frequency < 65 || frequency > 2100 || bins[b] < bins[b - 1] || bins[b] <= bins[b + 1]) continue;
      // Retain narrow tonal peaks above the surrounding broadband noise floor.
      // Square-root weighting previously let numerous weak drum/noise peaks dominate chroma.
      let floor = 0;
      for (let neighbor = -6; neighbor <= 6; neighbor++) {
        if (Math.abs(neighbor) > 1) floor += bins[b + neighbor] || 0;
      }
      if (bins[b] < 2 * floor / 10) continue;
      const shift = 0.5 * (bins[b - 1] - bins[b + 1]) / (bins[b - 1] - 2 * bins[b] + bins[b + 1] || 1);
      const midi = 69 + 12 * Math.log2((b + shift) * sampleRate / fftSize / 440);
      if (Math.abs(midi - Math.round(midi)) < 0.35) chroma[((Math.round(midi) % 12) + 12) % 12] += bins[b];
    }
  }
  const keys = [];
  for (let root = 0; root < 12; root++) {
    for (const mode of ['major', 'minor']) {
      const profile = mode === 'major' ? MAJOR : MINOR;
      keys.push({ root, mode, score: correlation(Array.from(chroma), Array.from({ length: 12 }, (_, i) => profile[(i - root + 12) % 12])) });
    }
  }
  keys.sort((a, b) => b.score - a.score);
  const key = keys[0];
  const chromaSum = chroma.reduce((a, b) => a + b, 0);
  // A virtually uniform pitch-class distribution has no preferred key. Keep
  // the best candidate otherwise, even when related keys have similar scores.
  const chromaEntropy = chromaSum > 0 ? -chroma.reduce((sum, value) => {
    const p = value / chromaSum;
    return p > 0 ? sum + p * Math.log(p) : sum;
  }, 0) / Math.log(12) : 1;
  const spectralFlatness = spectralWeight > 0 ? flatnessTotal / spectralWeight : 1;
  const tonal = chromaSum > 0 && Number.isFinite(key.score) && key.score > 0 && chromaEntropy < 0.995 && spectralFlatness < 0.45;
  const keyCandidates = tonal ? keys.slice(0, 3).map(candidate => ({
    key: `${NOTES[candidate.root]} ${candidate.mode}`,
    camelot: `${(candidate.mode === 'major' ? MAJOR_CAMELOT : MINOR_CAMELOT)[candidate.root]}${candidate.mode === 'major' ? 'B' : 'A'}`,
    strength: candidate.score, votes: 1, segments: 1,
  })) : [];
  const waveform = Array.from({ length: 90 }, (_, i) => {
    const start = Math.floor(i * samples.length / 90), end = Math.floor((i + 1) * samples.length / 90);
    let max = 0; for (let j = start; j < end; j += 20) max = Math.max(max, Math.abs(samples[j])); return max;
  });
  return {
    analysisVersion: ANALYSIS_VERSION,
    bpm: best.score > 0.12 ? Math.round(best.bpm * 10) / 10 : null,
    key: keyCandidates[0]?.key ?? 'Undetermined',
    camelot: keyCandidates[0]?.camelot ?? '—',
    keyCandidates,
    keyNote: tonal ? 'Estimated musical key. Confirm by ear.' : 'No clear tonal center detected. Percussive audio may not have a reliable musical key.',
    strength: best.score > 0.75 ? 'Strong beat' : best.score > 0.3 ? 'Steady beat' : 'Weak beat',
    waveform,
  };
}
