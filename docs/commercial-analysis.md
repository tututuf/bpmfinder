# Commercial default analysis and legacy backup

The default `ANALYSIS_ENGINE=commercial` runs original browser DSP and the LAION CLAP model. It does not load Essentia, TensorFlow.js, musicnn or the MTG Dance/Happy models. No per-analysis API or model licensing payment is required by the licenses recorded below. Hosting, transfer, infrastructure and payment fees remain separate.

## What runs

| Output | Default implementation | Meaning |
| --- | --- | --- |
| BPM | Original FFT/onset-periodicity DSP, mono 11,025 Hz | Estimated repeating tempo; half/double tempo can be ambiguous |
| Key / Camelot | Original pitch-class/chroma analysis and major/minor profile matching | Best-ranked spectral estimate; no preferred pitch/noise remains Undetermined |
| Energy | RMS dBFS mapped from −60..0 to 0..100 | Signal level; not perceived intensity |
| Dance | Quantized CLAP audio embeddings compared with danceable/non-danceable prompt ensembles | Relative text/audio match, 0–100 |
| Happy | The same CLAP audio embeddings compared with happy/sad prompt ensembles | Relative text/audio match, 0–100 |

Energy, Dance and Happy require an active Pro subscription in all environments, including development. New account saves also require Pro in production; development allows signed-in users to test saving separately. CSV export is free. Saved snapshots can be read, exported or deleted by their owner even after Pro expires. A commercial-compatible engine does not make the site's Pro plan free. Free analysis skips model download/inference and returns no paid measurement fields. Client-side execution is inspectable and is not DRM.

The complete decoded recording feeds the BPM/key estimator. Key estimation retains the best matching major/minor profile when related candidates are close, rather than hiding the result behind a score-gap threshold. The three best candidates accompany the result. A signal-level-independent spectral-flatness guard rejects broadband noise and a near-uniform chroma guard rejects audio with no preferred pitch class. Percussive recordings with resonant peaks can produce a candidate; this does not establish a composed musical key. Camelot is derived from the selected canonical key, including after edits. Current analysis version is `commercial-clap-2` (DSP key policy update; CLAP weights/prompts are unchanged). CLAP receives mono 48,000 Hz audio in ten-second windows until the end. A final incomplete tail uses the last full ten-second context, weighted by the remaining duration; recordings shorter than ten seconds use deterministic repeat padding. Silent windows supply no mood evidence. Window weights sum to the original duration. The processor never receives more than ten seconds, avoiding its random-crop branch. The file limit stays ten minutes/50 MB; batches stay at 20 files.

For each metric, `public/clap-policy.mjs` defines four positive and four negative original text prompts. Their normalized 512-dimensional embeddings are generated with the matching q8 text encoder during setup. The browser normalizes its audio embedding, computes the mean cosine similarity for each prompt group, and maps the difference using `100 / (1 + exp(-(positiveMean - negativeMean) / 0.07))`. Window scores are duration-weighted and rounded. The temperature is our fixed scoring parameter, not a claim to reproduce the checkpoint's learned class probabilities. Prompts, vectors, revisions and score-policy version are shipped together.

This is zero-shot audio/text matching, not a specialized, validated danceability or emotion classifier. Prompt selection, language, genre and recording content can affect scores. They are not calibrated probabilities, objective mood measurements or Tunebat-equivalent outputs. No mood score is fabricated from BPM, loudness or major/minor key. If CLAP cannot load/run, BPM/key and Energy remain available, Dance/Happy stay unavailable and the user can retry. The legacy engine is never an automatic fallback.

## Licenses and provenance

| Component | Recorded license | Provenance |
| --- | --- | --- |
| LAION `clap-htsat-unfused` | Apache-2.0 in the upstream model card | `https://huggingface.co/laion/clap-htsat-unfused/tree/8fa0f1c6d0433df6e97c127f64b2a1d6c0dcda8a` |
| Xenova ONNX/q8 conversion | Conversion explicitly identifies the upstream model; retain its Apache license and both cards | `https://huggingface.co/Xenova/clap-htsat-unfused/tree/c28f2883575e590e04d3146ff0713c2448d691ba` |
| Transformers.js 4.3.2 | Apache-2.0 | Installed `@huggingface/transformers/LICENSE` |
| ONNX Runtime Web 1.31.0-dev.20260914-8d85527a0 | MIT, plus bundled third-party notices | Official Microsoft license/notices at commit `8d85527a0` |
| Bundled HF Tokenizers / Jinja | Apache-2.0 / MIT | Installed package licenses copied alongside runtime |

The HF weight card declares Apache-2.0; `MODEL-LICENSE.txt` contains its full standard text. The separate LAION source repository uses CC0, preserved in `CLAP-CODE-LICENSE.txt`; this is not substituted for the model-card terms.

Keep `/analysis-notices.txt`, `public/models/clap-audio/*LICENSE*`, model cards, `manifest.json` and the license/notices files under `public/vendor/commercial/` with any redistribution. The UI does not add visible credit banners or model-credit links. The manifest records download URLs, sizes and SHA-256 hashes; the ONNX conversion itself is unmodified. Fixed text embeddings and score aggregation are project additions. Model-license terms do not grant rights to user-uploaded music, trademarks or third-party training content.

## Prepare and deploy

```powershell
npm ci
npm run prepare:analysis
npm test
npm run build
```

Preparation downloads pinned models, retains the 126.6 MB text encoder only under ignored `.cache/clap-build`, creates fixed text vectors and copies the browser assets to `public`. Native ONNX Runtime is used only to prepare text vectors. Deployment serves the 34.3 MB audio encoder, roughly 28.4 MB WASM runtime and about 0.6 MB JS runtime locally. First Pro use therefore transfers roughly 63 MB before normal HTTP compression/caching effects, and may take a while on mobile/slow connections. Later workers can reuse the browser model cache. Audio is never cached, uploaded or persisted. Results stay in memory until an authenticated user explicitly chooses Save Results; only an allowlisted analysis snapshot is then stored on the server. Full-track mood inference costs more CPU time as duration grows.

Use the default or set `ANALYSIS_ENGINE=commercial` in server environment configuration, then restart. Do not prefix this variable with `NEXT_PUBLIC_`. The server passes only the selected engine, sample rate, version and worker URL to the page. The original permissions flag is irrelevant to default analysis. Payment still requires its separate Waffo activation, public callback and `WAFFO_BILLING_ENABLED` readiness; this change does not enable sales.

## Explicit legacy backup

The former Essentia/MTG engine, source, model assets and license records are retained under `backups/legacy-analysis`, outside `public/`. `snapshot.json` records the original hashes. The compatibility adaptation changes only asset URLs to the gated prefix, adds engine/method provenance and keeps paid-field stripping current; `runtime-manifest.json` records the resulting files.

For local evaluation, set `ANALYSIS_ENGINE=legacy` and restart development. The worker and relative dependencies are served at `/api/analysis/legacy/`. In production, selecting legacy additionally requires `COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED=true`, recording permissions you have already obtained. It does not obtain a license or remove AGPL/MTG restrictions. Without explicit selection the entire legacy asset route returns 404, including when the files remain on disk. Old `/vendor/essentia-*` and `/models/musicnn|danceability|mood_happy` URLs are gone. Switching back to commercial and restarting disables the backup route again.

Only deploy the legacy directory if a backup is needed and its redistribution is appropriate. Plain `next start` requires it to remain on disk; standalone/serverless packaging requires explicitly copying it when deploying legacy (it is intentionally not traced into the default deployment). `npm run prepare:analysis:legacy` refreshes only backup model/runtime assets and never writes restricted assets into `public`.

## Verification

`npm test` covers DSP regressions, window coverage/tail weights, prompt score properties, malformed outputs, Free payload stripping, failure behavior and engine permission selection. `scripts/commercial-analysis-check.mjs` uses the supplied real 120 BPM MP3 and a 96-second chord/drum recording in Chromium, checks repeated inference, full-track processing, absent audio POSTs and intentional model-unavailable behavior. `--legacy` checks the alternate engine while the development server is explicitly configured for it. `scripts/billing-check.mjs` tests actual model inference through the Pro UI with isolated synthetic account/subscription fixtures, real CSV download and expiry enforcement; it creates no checkout or charge. Reports are in `artifacts/commercial-analysis/` and `artifacts/billing/`.
