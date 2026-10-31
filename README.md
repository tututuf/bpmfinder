# BPM Finder

An English music utility site for BPM and musical-key analysis, Camelot notation, tap tempo, a metronome, tempo conversion and practical music guides. Audio processing runs in the browser. The production site is https://bpmfder.com.

## Development

Use Node.js 24.13 or newer. Install the locked dependencies, copy `.env.example` to `.env.local` and configure the services you need. The install hook copies the unmodified Transformers.js browser bundle from the locked npm package and verifies its recorded SHA-256; the generated bundle is ignored by Git.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000 for the tools, or http://localhost:3000 for local Google sign-in. Local accounts use `.data/accounts.sqlite`. Environment files, databases, build output and browser reports are ignored by Git.

## Features

- Multi-file browser analysis, waveform preview, playback, BPM/key edits and derived Camelot notation.
- Free CSV export. Pro adds Energy, Dance and Happy measurements, and the Save Results checkbox for saving future analysis snapshots to an account.
- Google sign-in and email/password registration with single-use Resend verification codes.
- Account history with owner-only access, export and deletion. Audio files are not stored with results; unsaved results stay in memory.
- Waffo subscription integration with signed webhooks and durable event processing. Production checkout is currently disabled by configuration.
- Seven music articles with inline sources, original diagrams and downloadable teaching audio; responsive layouts, sticky contents, sitemap and canonical metadata.
- Client navigation with a persistent site header, custom dropdowns, image dialogs and reduced-motion support.

## Analysis

The default `commercial-clap-2` engine combines original FFT/onset and chroma DSP with a quantized LAION CLAP audio model. BPM and key are estimates; percussive audio and half/double tempo can be ambiguous. Camelot is a mapping of the selected major/minor key. Energy maps RMS signal level to a 0-100 scale. Dance and Happy compare audio embeddings with fixed text prompts; they are relative scores, not calibrated emotion probabilities or a reproduction of any competitor's algorithm.

BPM/key use the complete recording. Pro mood inference uses duration-weighted ten-second windows. Limits are 50 MB and ten minutes per file, and 20 files per selection. Browser codec support and available memory affect compatibility. First Pro inference downloads roughly 63 MB of model/runtime files before compression and caching.

`npm run prepare:analysis` reproduces the pinned commercial runtime and model assets. See [commercial analysis](docs/commercial-analysis.md) and [runtime notices](public/analysis-notices.txt) for component licenses, provenance and limitations. The former Essentia/MTG implementation is an explicit local backup outside the public deployment; using it commercially requires its separate licensing conditions. It is not an automatic fallback.

## Verification

```sh
npm run typecheck
npm test
node scripts/cloudflare-storage-check.mjs
npm run build:cloudflare
```

Unit tests cover DSP fixtures, access policies, accounts, billing and saved results. The workerd storage check verifies concurrency, transaction behavior, password hashing, owner isolation and restart persistence. Browser checks are available in `scripts/`; most accept `BASE_URL`, `CHECK_OUTPUT` and `CHROME_PATH`. They use isolated browser contexts and write ignored reports under `artifacts/`. Passing functional checks is not a broad real-music accuracy benchmark.

## Cloudflare deployment

The site runs as a Cloudflare Worker through OpenNext. A SQLite-backed Durable Object persists accounts, billing and saved snapshots. R2 serves the large model/runtime assets and OpenNext page cache.

```sh
npx wrangler login
npm run deploy:cloudflare
node scripts/cloudflare-secrets.mjs
```

The secrets helper reads only allowlisted server settings from `.env.local` and uploads them over stdin. Never commit production credentials. Production starts with a separate database; local test accounts are not migrated.

See [deployment instructions](docs/cloudflare-deployment.md), [email authentication](docs/email-auth.md), [Google login](docs/google-login.md), [Waffo billing](docs/waffo-billing.md) and [saved results](docs/saved-results.md) for setup and operational details.
