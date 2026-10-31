# Competitor-informed analysis upgrade

Date: 2026-10-28. Result version: `essentia-5-estimate`. This document distinguishes observed features from our implementation choices.

## Evidence boundary

The user's Tunebat screenshot visibly contains Key, Alt Key, BPM, Energy, Danceability and Happiness columns, file selection, search and a Save Results control. The supplied research proposes a browser-local worker pipeline, Essentia and ML models. Fresh direct requests to Tunebat Analyzer and Songdata returned Cloudflare403. Search-tool requests supplied no usable citations. We did not bypass the challenge, access paid features, inspect internal bundles, or upload the user's audio externally. We cannot claim Tunebat uses these exact algorithms, profiles, weights, scores or model versions.

Primary technical sources consulted directly:

- https://essentia.upf.edu/reference/std_KeyExtractor.html
- https://essentia.upf.edu/reference/std_Danceability.html
- https://essentia.upf.edu/licensing_information.html
- https://essentia.upf.edu/models/feature-extractors/musicnn/msd-musicnn-1.json
- https://essentia.upf.edu/models/classification-heads/danceability/danceability-msd-musicnn-1.json
- https://essentia.upf.edu/models/classification-heads/mood_happy/mood_happy-msd-musicnn-1.json
- The installed Essentia.js0.1.3 source/docs and downloaded original TFJS graph definitions.

## Feature mapping

| Reference feature | Current implementation | Interpretation / limits |
| --- | --- | --- |
| File analysis / multiple results | Local Web Audio decoding, serial queue, reusable worker, progress and cancellation | Up to20 files per selection,50MB/file,10min duration |
| BPM | Local onset/autocorrelation estimate + Essentia Degara independent cross-check | Preserve the regression-tested120 BPM result; show engine agreement or ambiguity |
| Key | Essentia HPCP36 bins, tuning correction,3 profiles over the entire recording | Best candidate displayed; agreement and independent tonal evidence determine its uncertainty label |
| Alt Key | Camelot lookup over24 keys | Not a separately detected second key |
| Energy | RMS dBFS mapped−60..0 to0..100, with raw RMS/peak/crest | Signal strength proxy, not a trained perceptual energy or competitor-equivalent score |
| Danceability | MSD MusiCNN embeddings + official danceability classifier | Mean danceable-class activation x100; optional, full-coverage window aggregate |
| Happiness | Same embeddings + official mood_happy classifier | Mean happy-class activation x100; not derived from major/minor alone |
| Search and sorting | Track/key/Camelot search, key-status filter, BPM/name/Camelot sort | CSV/JSON exports respect visible filtering and order |
| Save results | Versioned browser metadata history, latest50 completed records | No audio saved; reselect originals to play/reanalyze |
| Review / correction | Track inspector, ranked candidates, full-track profile evidence, BPM/key form, auto Camelot, reset | Manual edits are labeled, persisted and exported |
| Related utility flows | Existing playback/seek, half/double BPM, tap tempo and metronome | Kept alongside upgraded analysis |

Account billing, paid access gates, cloud sync and song-catalog search are not inferred requirements for a local file-analysis upgrade and were not added.

## Runtime and model design

Web Audio renders the entire recording at11025Hz(local DSP),44100Hz(Essentia) and optionally16000Hz(models). Each KeyExtractor profile receives every44.1kHz sample, without section sampling or a90-second crop. Profiles: bgate, temperley, krumhansl. Candidate grouping retains votes, fit and section coverage. The highest-vote candidate is displayed, breaking ties by average fit. A consistent label requires >=2/3 profile votes, strength>=0.55 and agreement with independent narrow-peak tonal evidence; other usable candidates are labeled low confidence. Invalid, empty or zero-strength candidates stay undetermined. These are heuristics, not calibrated confidence. Candidate agreement and strength are displayed as evidence, not accuracy percentages.

For mood, consecutive patches cover the entire recording and use187 mel frames with512-sample frames,256-sample hop and96 bands at16kHz (3.008seconds per patch). The final patch aligns to the end and is weighted by newly covered duration to limit double-counting. The model produces200-dimensional pre-ReLU dense embeddings, then two-class softmax heads. The official base TFJS graph fuses the expected `model/dense/BiasAdd` with ReLU. We reconstruct that preactivation from the preceding batchnorm output and original dense kernel/bias. Feeding50-dimensional genre tags or post-ReLU activations would be incompatible with the documented classifier input. A dedicated check verifies reconstructed ReLU matches the fused output within1e-4.

All assets load from this site; no inference API is called. TensorFlow uses WASM with one thread, CPU fallback if unavailable. Model/runtime caches live in a reusable worker; clearing/canceling terminates the worker. Each temporary Essentia vector is deleted and TensorFlow inference uses tidy scopes. Testing two consecutive analyses found58 retained model tensors both before and after the second inference.

If advanced tonal processing cannot start, local DSP remains available with an explicit fallback warning. If model loading/inference fails, danceability/happiness remain null and BPM/key still render. Scores are never filled using random numbers or tempo/key-based guesses. Rounded model scores can be0 or100, especially on artificial/out-of-distribution audio; they should not be interpreted as certainty.

## Assets and licenses

`npm run prepare:analysis` copies pinned runtime assets and downloads official unchanged model bytes, hashes and metadata. The musicnn archive contains inconsistent central-directory filename lengths/offsets; the script recovers only the two allowlisted model files from their actual local headers and timestamp metadata. No embedded filesystem paths are extracted.

Essentia.js0.1.3 is AGPL-3.0; UPF also offers commercial licenses. The official pretrained models are CC BY-NC-ND4.0/commercial licensing. This implementation is a local non-commercial evaluation prototype; commercial deployment requires appropriate licenses. Runtime/model credits are accessible in the interface and at `/analysis-notices.txt`. This upgrade does not change the project-wide license or imply deployment clearance.

## Verification

-21 unit checks: synthetic tempos, sample-rate consistency, chord/drum key fixtures, noise/percussion abstention,24 Camelot mappings/accidental normalization, consensus/changing-key policies, energy bounds, CSV escaping/provenance and version synchronization.
- Real user MP3/renamed bytes regression:120 BPM, uncertain key, history upgrade/preservation and mobile layouts.
-3-file batch:124/Aminor,98/Cmajor,128/Dminor; playback, seek, formula-safe CSV, history, cancellation and upload after cancellation.
- Upgrade browser checks: real classifier inference, nine tonal observations, manual corrections/auto Camelot/reset, sort/search/filter/export, responsive modal and focus trap, basic mode and failed-model fallback.
- Model integrity: mathematical embedding reconstruction and stable TensorFlow tensor count after repeated inference.
- Existing full interface and production build checks.

No broad claim of accuracy is justified by these functional checks. Further work requires independently labeled real music across genres, tempo/key changes and tuning, plus perceptual energy validation if that metric is desired.
