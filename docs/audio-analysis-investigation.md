# Supplied drum-loop analysis investigation

Date: 2026-10-28. Scope: reproduce the user's mismatch, identify causes, correct the prototype and add regressions. This is not a general accuracy benchmark.

Historical note: this report describes the `dsp-2` investigation. The subsequent `essentia-3` upgrade now ships Essentia and optional mood models; see `competitor-upgrade.md`. Current browser regression artifacts carry the newer version.

## Reference and observed results

- Recording: `beansandsausages-drum-loop-120-bpm-rock-funk-groove-553903.mp3`
- SHA-256: `34d58ee7a0874d5786a105c044f5a72cd251042ad6053079286ed8744880cf97`
- 1,025,280 bytes; 32.04 seconds; stereo.
- The Tunebat result is from the screenshot supplied by the user. We did not upload the recording to Tunebat during this investigation.

| Source | BPM | Key | Camelot |
| --- | --- | --- | --- |
| User's Tunebat screenshot | 120 | B major | 1B |
| Original local browser result | 60 | A minor | 8A |
| Corrected local browser result (`dsp-2`) | 120 | Undetermined | — |

## Causes and fixes

Web Audio decoding and resampling were functioning. The browser decoded at 48 kHz; the worker received actual 11,025 Hz mono samples. The mismatch was in the simplified DSP.

The original onset FFT covered about 93 ms, with a 23 ms hop. Smearing the short transients favored a repeating two-beat accent: the internal candidate score was 0.937 at 60 BPM and 0.810 at 120 BPM. Reducing the frame to about 46 ms and the hop to 12 ms reversed the ranking (0.949 at 120 versus 0.897 at 60 in the initial window experiment). Frequency-band and magnitude normalization now keep equivalent analysis settings across sample rates. The final full recording returns 120 BPM at 11,025, 22,050 and 44,100 Hz. Scores are ranking values, not confidence percentages.

The original key estimator accumulated numerous weak spectral peaks using square-root magnitude weights. This let broadband percussion/noise flatten the pitch-class distribution. A best A minor profile correlation of only 0.297 passed the original 0.25 acceptance threshold. That did not justify a definite key.

The revised estimator requires spectral peaks to exceed their surrounding noise floor and accumulates their magnitudes without boosting weak peaks. It then requires profile correlation >=0.5, a >=0.05 margin over the next candidate, and normalized chroma entropy <0.95. Otherwise it reports `Undetermined` and omits Camelot. These are conservative prototype heuristics. An initial entropy-only gate also rejected known chord/drum mixes; spectral peak filtering fixed that regression instead of simply relaxing the gate.

## Independent reference and remaining uncertainty

Essentia.js 0.1.3 was used locally as a development reference on the same browser-resampled 44.1 kHz recording. Its `RhythmExtractor2013` returned about 117.86 BPM with multifeature and 120.27 with degara. Its key profiles disagreed: G major (bgate), G minor (edma), F# minor (krumhansl/temperley/shaath), with strengths between 0.169 and 0.454. These are outputs of different configurations, not votes establishing ground truth, and their strength scales should not be equated with our correlation.

The supplied screenshot alone does not establish B major as the recording's correct musical key. Percussive material can have pitched components without establishing a reliable major/minor tonal center. We have insufficient evidence to assign one here. No filename or expected BPM is used by production detection; identical bytes renamed `reference-audio.mp3` produce the same result.

Essentia.js remains a development dependency and is not part of the shipped analysis worker. Broader accuracy still needs evaluation on independently labeled recordings across genres, tempos, tuning and key changes. This sample fix does not remove half/double-tempo ambiguity in general.

## Validation and history

- 16 automated DSP/version checks cover synthetic tempos, three sample rates, three chord/drum mixtures in two sample rates, silence, short input, noise and percussion abstention.
- Browser regression uses the original MP3, identical renamed bytes, obsolete history replacement, preservation of unrelated history, metadata restore and 375/390/768/1440px layouts.
- Existing batch and interface checks cover decoding, queue cancellation, playback, CSV and navigation.
- Artifacts: `artifacts/audio-diagnosis/report.json`, `regression.json`, `result.png`, `real-audio-mobile.png`, `engine-comparison.json` and `dsp-experiments.json`.
- No audio upload is needed. Local PCM artifacts are ignored; the source MP3 is not copied into public assets.

Old history retains its values but is visibly marked as an older estimate. Reselecting the same filename replaces the obsolete saved result; the original audio is necessary because localStorage stores metadata only.
