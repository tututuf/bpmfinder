# Remaining key mismatch: B major reference

## 2026-10-30: Vocal Remover comparison and current DSP instability

The user reports B major from multiple products, including Vocal Remover. This is a user-provided comparison, not a newly observed successful competitor run. REA capture of `https://vocalremover.org/key-bpm-finder` returned a Cloudflare 403 `Just a moment...` document. Evidence: `ev_b26c18864bb87ad1f5b3427af4c3458f05b23a7e893a1db9712bd425d5cc0eee`. No analyzer JavaScript/configuration or successful competitor result was captured. No original audio was uploaded to that service. Web lookup also returned no usable source text. Do not attribute Essentia, libKeyFinder, a neural model or any precise parameters to this competitor from this observation.

Fresh Chrome decode of the original MP3 at 44100 Hz, with the existing application resampling pipeline, reproduces the following current `dsp-3` results. Original file SHA256 remains `34d58ee7a0874d5786a105c044f5a72cd251042ad6053079286ed8744880cf97`; duration 32.039977 seconds; stereo.

| Input rate | Whole original | Original at 0.1 gain | Remove first 0.1 seconds | Prepend 0.1 seconds silence, preserving all original audio |
| --- | --- | --- | --- | --- |
| 11025 Hz | D major | D major | B minor | B major |
| 22050 Hz | B minor | B minor | F-sharp minor | B minor |
| 44100 Hz | B minor | B minor | F-sharp minor | B minor |

BPM remains 120 in these whole-recording variants. This is not an independent assertion of any true major/minor key. Prepending silence provides particularly useful evidence: the musical content is identical, but moving the analysis frame grid changes the inferred key, even to the user-reported B major. Merely choosing that offset would be fitting the answer to this file, not fixing key detection.

Current algorithm mechanisms:

- Key FFT windows are about 743 ms long and nonoverlapping. A Hann window attenuates frame boundaries; transient placement changes the effective pitch-energy weighting. The grid therefore matters on this drum loop.
- Local spectral maxima enter chroma only if they exceed a hard neighborhood ratio and lie within 0.35 semitones of a rounded equal-tempered note. Small peak changes near either cutoff can change which evidence survives.
- Surviving peak magnitudes are pooled directly across the whole recording. There is no explicit harmonic/percussive separation, adaptive tuning estimate or harmonic salience stage. Drum resonances can influence the chroma profile.
- The 24 major/minor templates are ranked by correlation. The previous candidate-acceptance change retained the winner; it did not improve the underlying pitch evidence or establish estimator accuracy.

An offline comparison using the retained `keyfinder-js` 1.0.3 package returned A minor at both 11025 and 44100 Hz on the retained PCM. This is a diagnostic comparison only: no dependency was added, and no third-party implementation was moved into production. Agreement across products is useful evidence, but cannot alone establish a musically defined major/minor key for percussive audio or prove that independent algorithms are involved.

General window experiments used the retained PCM (historical browser decode differs slightly from the fresh 44100 Hz decode above): compare nonoverlap, 75% overlap, 87.5% overlap and an alternative continuous pitch weighting, at two rates and four silence prefixes. Both overlap settings with the existing peak policy returned B minor in all eight comparisons. Continuous weighting alone did not consistently remove instability. No tested alternative establishes B major parity or improved real-music accuracy, so production remains unchanged. A stable B minor is not proof of a correct B minor.

Reproduction:

- `node scripts/key-preprocessing-investigation.mjs <original.mp3>`: fresh browser decode, gain/crop/padding/rate comparisons; writes `artifacts/key-parity/preprocessing.json`.
- `node scripts/key-spectrum-investigation.mjs`: existing peaks versus bins/power/whitening diagnostics; writes `artifacts/key-parity/spectrum.json`.
- `node scripts/key-window-investigation.mjs`: window-overlap and pitch-weight comparisons; writes `artifacts/key-parity/window-experiments.json`.
- `artifacts/key-parity/independent-keyfinder.json`: independent offline comparison, not a production engine.

Research conclusion: a concrete frame-alignment/preprocessing sensitivity has been reproduced in our estimator. The precise reason Vocal Remover returns the user's B major remains unverified because its analyzer was not reached. Further production work should address temporal coverage and harmonic pitch extraction, then evaluate against labeled tonal audio plus percussion, silence-prefix, gain, tuning and sample-rate regressions. Do not change Camelot mapping, hardcode this file, or use an offset selected solely to output B major.

Subsequent product decision: on 2026-10-28 the user chose to display the current algorithm's best candidate. Version `essentia-5-estimate` now reports D minor /7A for this recording, labeled low confidence. Votes rank first and mean profile fit breaks ties. This changes output policy, not the raw key extractor or competitor parity; the historical investigation below remains applicable.

Date: 2026-10-28. Production pipeline: `essentia-4-full`.

## Outcome

The supplied MP3 still does not match the user's Tunebat screenshot (B major / 1B). No parameter fix establishing parity was found, and no production key was forced. Whole-track coverage fixed sampling scope, not the underlying estimator difference. Earlier successful UI/build/regression checks establish execution and known-fixture behavior, not competitor parity or real-world key accuracy.

## Direct checks

- Re-read the original screenshot: BPM120, key B major, Camelot1B. The mood/energy fields are locked, so the screenshot provides no numeric reference for them.
- Original bytes: SHA256 `34d58ee7a0874d5786a105c044f5a72cd251042ad6053079286ed8744880cf97`. Browser decodes at48000Hz and actually resamples to44100Hz:1,412,964 samples,32.04s. This is not a sampling-rate-label substitution.
- Current raw full-track results: bgate G minor0.447968; temperley D minor0.538279; krumhansl D major0.451664. B major is absent before acceptance rules. Removing the final acceptance gate would therefore not reproduce B major.
- Compared48 explicit configurations: HPCP12/36, lower-frequency bounds25/65Hz, available tuning-correction settings, and8 key profiles. None produced B major. This finite comparison does not establish that no Essentia configuration can produce B major.
- Left, right and mixed channels each processed separately at44100Hz. No B major among their3 current-profile outputs. RMS values remain close; no severe cancellation indicated by their aggregate power. This does not prove phase is irrelevant to every feature.
-24 synthetic harmonic chord progressions,12 roots x major/minor, test transposition and profile/acceptance behavior. B major is recognized and maps to1B. These fixtures are not a labeled real-recording accuracy corpus.

## Competitor observation limit

REA controlled browser capture still reaches Cloudflare's `Just a moment...` page. No Analyzer application scripts, algorithm configuration or uploaded-file execution were obtained. Evidence id: `ev_604d362a3f01d4a72289953ce7abaa47f370d64d61bafa0621629b77aa62067c`. No original audio was sent to an external service, no challenge was bypassed, and no Pro results were accessed.

Public descriptions of using Essentia do not establish identical feature extraction, profiles, tuning, model weights, resampling or aggregation. The screenshot alone cannot identify which of those differ. It also does not independently establish the recording's musically correct major/minor key.

## Reproducible local diagnostics

- `node scripts/key-diagnostics.mjs`: consumes the locally retained44100Hz PCM; outputs `artifacts/audio-diagnosis/key-diagnostics.json`.
- `node scripts/key-stereo-diagnostics.mjs <original.mp3>`: decodes original bytes, records digest, channel power and raw outputs in `artifacts/audio-diagnosis/key-stereo.json`.
- `node scripts/key-fixture-diagnostics.mjs`: synthesizes24 known progressions; saves `artifacts/audio-diagnosis/key-fixtures.json` and asserts expected keys.
- Current public implementation reference: the installed Essentia.js0.1.3 API and upstream MTG source at `https://github.com/MTG/essentia/blob/master/src/algorithms/extractor/keyextractor.cpp`. Upstream master is explanatory context, not proof of the exact build used by either site.

## Remaining work for parity

Obtain an authorized successful Analyzer run's actual analysis-worker configuration or an independently labeled real-audio evaluation corpus before replacing the engine/parameters. Preserve the distinction between an uncertain local estimate, a competitor's returned label and independent musical ground truth. This mismatch remains unresolved.
