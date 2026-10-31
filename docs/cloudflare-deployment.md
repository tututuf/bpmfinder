# Cloudflare deployment

Next.js 16.4.3 is built with `@opennextjs/cloudflare` 1.20.15 and deployed as Worker `bpmfinder`. `cloudflare/worker.ts` wraps generated OpenNext output. The deployed UI, APIs and same-document navigation use the same application source as local development.

## Storage and assets

- `APP_DATABASE`: SQLite-backed Durable Object `AppDatabase`, namespace name `bpmfinder-v1`. Accounts, registration codes, rate limits, billing and saved results use the existing store logic over asynchronous private service calls. Each operation is wrapped in `transactionSync`. The public Worker exposes no database administration endpoint.
- Local Node.js continues to use `node:sqlite` in `.data/accounts.sqlite`. It is a separate database; local development accounts are not automatically copied to production.
- `ANALYSIS_ASSETS`: R2 bucket `bpmfinder-assets` serves the CLAP ONNX model and ORT WASM, both larger than the static-asset limit. The wrapper retains their original same-origin URLs and supports caching, HEAD and byte ranges. Source files remain in `public/`; the build script removes only their copies inside `.open-next/assets`.
- `NEXT_INC_CACHE_R2_BUCKET`: separate bucket `bpmfinder-cache` stores OpenNext's generated page cache. It contains no account data.

## Commands

```sh
npm ci
npm run typecheck
node --test --test-isolation=none tests/*.test.mjs
node scripts/cloudflare-storage-check.mjs
npm run build:cloudflare
npm run preview:cloudflare
# Publish the already-built bundle and populate static page cache:
node scripts/deploy-cloudflare.mjs
```

`npm run deploy:cloudflare` combines build and deployment. Sign in with `npx wrangler login` on a new machine. First-time deployment must create the two named R2 buckets and retain the Durable Object migration in `wrangler.jsonc`. The deployment script uploads the generated page cache and the two files listed in `.open-next/large-assets.json` using the official Wrangler R2 CLI, then publishes the Worker. This avoids the OpenNext cache population helper that failed under the tested Windows/proxy environment. OpenNext warns that native Windows builds are experimental; the generated bundle was separately checked in workerd before publication.

Production is assigned to `bpmfder.com` and `www.bpmfder.com`; the latter redirects to the canonical origin. The fallback Worker address is `https://bpmfinder.qq2429263683.workers.dev`. OAuth and registration are configured for the canonical domain.

## Secrets

`node scripts/cloudflare-secrets.mjs` reads the allowlisted server credentials from ignored `.env.local` and sends them to Wrangler over stdin. Values are never printed or saved to a temporary file. It excludes local origin, database path and billing-enable overrides. Cloudflare's public runtime variables are in `wrangler.jsonc`; the production canonical/auth origin is `https://bpmfder.com`.

Google must allow `https://bpmfder.com/api/auth/callback/google`. Payments remain disabled (`WAFFO_BILLING_ENABLED=false`), matching the existing configuration; a deploy alone does not enable real checkout or activate a Waffo store. The webhook route is `/api/billing/webhook` and still requires a valid provider signature.

## Checks

`scripts/cloudflare-storage-check.mjs` executes in workerd, including password hashing, concurrent code reservations/single-use registration, concurrent checkout reservation, duplicate webhook handling, owner-only results, rollback on idempotency conflict, operation allowlisting and persistence across a runtime restart. It creates isolated local test state under ignored `artifacts/`.

The existing article and SEO browser scripts accept `BASE_URL` to check the Worker. Local reports are under `artifacts/cloudflare-deploy/`. Do not commit `.env.local`, `.data`, `.wrangler`, `.open-next`, private keys, local test accounts or browser artifacts.
