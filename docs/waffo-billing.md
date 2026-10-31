# Waffo Pancake subscriptions

Implemented with `@waffo/pancake-ts` 0.27.0, using the official Waffo integration skill and the installed SDK's types/source. This project runs the payment SDK on the Node server only.

## Plans and feature access

| Plan | USD billing | Access |
| --- | --- | --- |
| Free | $0 | BPM, key, Camelot, playback, editing, Tap Tempo, metronome |
| Pro Monthly | $7.99 each month | Free features plus Save Results, Energy, Dance, Happy and their detail fields |
| Pro Yearly | $35.88 each year | Same Pro features; equivalent to $2.99/month |

The application has no trial or mid-subscription plan switching. Subscribers cancel automatic renewal from Pricing and retain any remaining paid period. Past-due and expired subscriptions cannot access Pro. A recovered/renewed paid period can restore access.

Audio and unsaved results remain in browser memory. Authenticated Pro users can select the Save Results checkbox to automatically persist each subsequent completed analysis in the account database; no audio is stored. Owners can read, export and delete existing snapshots after their plan expires. The browser skips mood-model downloads/inference for Free and excludes paid fields from worker messages and UI. CSV export is free for guests, Free and expired users; paid insight columns require current Pro access in the live workspace. Save Results checks current subscription access on the server. Previously analyzed files can be recalculated in the current page with **Analyze with Pro**. Leaving/refreshing the page clears files/results.

Client-local analysis is not DRM: downloadable JavaScript/model files can be inspected or modified by a technically capable person. This implements application subscription access, not secrecy for public analysis algorithms. Enforcing model access against modified clients would require a different delivery/execution architecture.

## Current provider setup (2026-10-30)

The supplied private key successfully authenticated against the explicitly selected merchant/store. Both products were created and published, and their IDs saved to ignored `.env.local`:

| Item | ID |
| --- | --- |
| Merchant | `MER_40Z4R81KYkqUFvXb60T2gL` |
| Store | `STO_1GdAj8WbNK6VuxxHPoKA8D` |
| Monthly product | `PROD_3E3QxhVi6iQ0vVbTXTX06j` |
| Yearly product | `PROD_01aq44EkjwaYpBqKYm4yz7` |

The provider reports `prodEnabled: false`, `payinEnable: true`. Production collection therefore still needs store activation through Waffo. No checkout, order, card authorization or payment was created by this implementation/verification.

The local site runs at `http://localhost:3000`. No public webhook has been registered: Waffo cannot deliver production events to localhost. Deploy the application and register the reachable HTTPS callback before enabling sales.

## Environment

Use `.env.example` as the template. Keep private keys in server-only environment variables; never prefix them with `NEXT_PUBLIC_`, commit them, put them in screenshots or print them in scripts.

```dotenv
WAFFO_MERCHANT_ID=MER_...
WAFFO_STORE_ID=STO_...
WAFFO_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
WAFFO_ENVIRONMENT=prod
WAFFO_MONTHLY_PRODUCT_ID=PROD_...
WAFFO_YEARLY_PRODUCT_ID=PROD_...
WAFFO_WEBHOOK_URL=https://bpmfder.com/api/billing/webhook
WAFFO_BILLING_ENABLED=false
ANALYSIS_ENGINE=commercial
COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED=false
```

The private key can contain real or escaped newlines; the official SDK normalizes it. The API key determines the merchant API's environment. Setting `WAFFO_ENVIRONMENT=test` alone does not turn a production key into a test key. Use the matching test/prod key, products and callback subscription.

Default analysis now uses original DSP and the Apache-2.0 CLAP model; see `docs/commercial-analysis.md` for licenses, provenance and score semantics. The former Essentia/MTG assets remain an isolated explicit backup outside `public/`. `COMMERCIAL_ANALYSIS_LICENSE_CONFIRMED` is required only for production legacy analysis, not the default engine. It records permissions already obtained and does not grant them. `WAFFO_BILLING_ENABLED` remains false: provider production activation and a public callback still need to be ready before sales.

`NEXTAUTH_URL` must be the canonical deployed HTTPS origin. It controls Origin validation and the checkout success URL. Continue using the existing Google callback and email-auth configuration documented alongside this file.

## Repeatable catalog setup

```powershell
# Read-only provider inspection and validate existing configured prices
node scripts/setup-waffo.mjs

# Create missing matching products; save IDs in .env.local; publish test versions
node scripts/setup-waffo.mjs --apply --publish

# After public deployment and setting WAFFO_WEBHOOK_URL
node scripts/setup-waffo.mjs --apply --publish --webhook
```

The script uses the explicitly configured store, reuses matching/configured products, stores recovery IDs in `.data/waffo-setup-{mode}.json` and supplies deterministic SDK idempotency keys. It verifies the USD amount, SaaS tax category and billing interval. It does not overwrite credentials or switch either sales flag. The default invocation makes no provider mutations.

Webhook registration first probes the deployed callback with an unsigned request and requires HTTP 401. It reuses an existing matching URL/mode subscription with the needed events. It does not register localhost or accept a generic HTTP-200 page as a webhook. The store's production activation and commercial-model permissions are separate from publishing products.

For local test-mode integration, use a public HTTPS tunnel to port 3000, set its `/api/billing/webhook` URL, register a **test-mode** callback using a test key, and use provider test payment methods. Keep browser sign-in on the configured canonical local origin. This project has no endpoint that bypasses webhook signatures or grants arbitrary subscriptions.

## Payment and entitlement flow

1. The signed-in user selects an allowlisted plan. `/api/billing/checkout` validates canonical Origin, session, server readiness and rate limit.
2. The server reserves one pending checkout per user/store/environment, chooses product/price itself and calls `checkout.authenticated.create`. The browser cannot choose an amount, order owner or trial.
3. The SDK signs merchant requests and issues a short-lived buyer session. The returned `checkoutUrl` carries its token in the fragment. It is sent directly to the browser, never logged or stored. Only HTTPS `pancake.waffo.ai` checkout URLs are accepted.
4. The success page polls `/api/billing/status`. URL parameters and checkout creation never grant access.
5. `/api/billing/webhook` reads the raw UTF-8 body (64 KiB maximum), verifies `x-waffo-signature` with the SDK's production/test public key, validates mode/store and commits a minimal durable inbox record before returning HTTP 200.
6. Next `after()` processes the inbox. Status/checkout/cancel requests also drain it, so committed work survives a process interruption after acknowledgement. Failed processing remains pending for retry.
7. The verified subscription event binds to the reserved external checkout ID, metadata plan, provider-scoped account identity and billing period. Only active/canceling subscriptions with a future paid-period end grant Pro.

Fulfillment handles activation, renewal, recovery, uncancel, plan-change, cancellation and past-due events. `subscription.payment_succeeded` records a charge; it cannot activate or extend access without the period event. Full refunds of the current payment revoke access; old-payment/partial refunds do not revoke the current period. Delivery IDs deduplicate retries. Timestamps/state priorities prevent older activation events from undoing a newer revocation, including cancellation/refund arriving first. Billing rows are scoped to store and environment.

The SDK performs signature cryptography and replay-window validation. Do not add a custom signing scheme or parse/re-serialize the body before verification. Current SDK 0.27.0 tolerates 45 minutes of past timestamp age and one minute of future skew. Keep server clocks synchronized.

Cancellation validates the authenticated identity and derives the order from the server database. Client-supplied order IDs are ignored. Provider cancellation responses update local state, and signed lifecycle events remain authoritative for later transitions. Cancellation remains available even when new sales are disabled. Canceling an overdue subscription cannot restore Pro.

## Deployment and persistence

The current implementation shares the durable SQLite account database (`AUTH_DATABASE_PATH`, default `.data/accounts.sqlite`). Keep it on persistent disk, back it up and run one application instance against that local database. Do not deploy this unchanged to ephemeral serverless storage or multiple independent disks. Migrate account/billing/inbox transactions to a shared database before that deployment model.

Each login provider has a stable separate opaque billing identity. Matching Google/email addresses do not automatically merge subscriptions. Use the same sign-in method/account used for purchase. Sessions created before this integration need one fresh sign-in to acquire the identity.

Before opening production sales: activate the Waffo production store, resolve model/dependency permissions, deploy with persistent storage and production auth settings, register/verify the public production callback, then set both readiness flags to true. Exercise an approved provider test flow first. Do not treat the automated local fixtures below as evidence of a live payment.

## Verification

```powershell
node --test --test-isolation=none tests/*.test.mjs
npm run typecheck
node scripts/billing-check.mjs
node scripts/auth-check.mjs
node scripts/navigation-check.mjs
node scripts/browser-check.mjs
npm run build
```

`billing-check.mjs` uses a synthetic encrypted local session and an isolated database row, with actual file decoding, worker/model execution and CSV downloads. It checks Free/Pro transitions, free CSV export and Pro-only saving, expiry, overdue cancellation UI, prices/layout, invalid webhook/API access and fake-success rejection. Its generated rows are removed afterward. It never creates provider checkouts or payments. The signature unit test uses a generated fixture RSA key; the production route cannot use that test key.

Evidence lives in `artifacts/billing/report.json` and screenshots; refreshed tutorial screenshots come from `scripts/capture-tutorial.mjs`. A real paid checkout and public webhook delivery have not been verified in this local environment.

## Local development access

Energy, Dance and Happy require a signed-in account with an active Pro subscription in every environment, including npm run dev. Billing status always reports the actual subscription and expiry. CSV export remains free; Free exports omit paid measurements. Only Save Results retains a development bypass, exposed as developmentSavingUnlocked; sign-in is still required to own each snapshot. The Pricing development banner explains this saving-only access. This does not create subscriptions or enable checkout. Production enforces Pro for new saves as well. No public URL parameter, cookie or persisted grant controls the development saving bypass. Run scripts/development-access-check.mjs against development and with --production against a production server to verify both paths. Free/Pro/expiry browser checks such as billing-check.mjs work in either mode with matching canonical NEXTAUTH_URL and an isolated AUTH_DATABASE_PATH.
