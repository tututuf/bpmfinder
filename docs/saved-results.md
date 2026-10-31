# Saved Results and free CSV

Updated October 31, 2026. Save Results is an opt-in checkbox for subsequent analysis, superseding the earlier manual-save button. CSV remains free.

## User behavior

- Export CSV is free, including signed-out use. Free exports contain track name, BPM, key, Camelot and duration. Internal tempo reference, engine, source and analysis version are excluded from both analyzer and history exports. Energy/Dance/Happy columns require current Pro access in the analyzer.
- Save Results is a checkbox in the upload analysis options, unchecked by default. While selected, each newly completed audio analysis is automatically added to account history as a separate snapshot. It remains selected for subsequent uploads in the same mounted workspace. Reanalysis is a new analysis and can create a new history entry.
- Selecting it does not backfill existing results. Editing, filtering, sorting and CSV export never create or change history entries. The saved result represents the measurements when analysis completed.
- Production saves require a signed-in account and active Pro subscription. Development bypasses payment only for saving, but still requires sign-in so each save has an owner. Energy/Dance/Happy analysis requires active Pro in both environments.
- Unchecking stops new saves and discards pending retries. Previously sent requests may already have committed. Signing out, changing account or losing Pro disables saving. The option is not persisted through page reload/navigation. Returning from login/Pricing requires selecting the checkbox again.
- A failed save leaves the audio analysis intact and offers Retry saving for the failed snapshot using its original request ID, preventing duplicate rows even if the first response was lost. Clear all affects only the current workspace and does not disable the checkbox.
- Saved Results is available in the navigation and account menu. Owners can view, export and delete snapshots, including after Pro expires. Previously saved insight values remain available in those snapshots.
- No audio, waveform samples, local paths or playback URLs are stored. Re-select original audio to play it or analyze it again. No result history is written to localStorage or sessionStorage.

## Persistence and deployment

The `saved_results` table is created automatically in the existing account SQLite database, `.data/accounts.sqlite` by default; `AUTH_DATABASE_PATH` overrides it. Back up the account database with SQLite's backup facility, or stop the server before copying it and any associated WAL state. Do not discard the account database during deployments.

Use persistent storage on a single server. A disposable filesystem will lose accounts and saved results. Multiple application instances need a shared database architecture before deployment; independent SQLite files do not synchronize.

Snapshots use the same provider-scoped authenticated billing identity as subscriptions. Google and email/password identities are separate, even when their email addresses match. An account can only list, read or delete its own snapshots. Result names/measurements come from browser analysis and should not be treated as server-verified audio measurements.

## API

- `GET /api/results?before=<cursor>`: signed-in owner list, newest first, 20 items per page, stable sequence cursor.
- `POST /api/results`: signed-in Pro owner; `{ requestId, tracks }`. UUIDv4 request IDs make retries idempotent; reusing one with different content returns 409.
- `GET /api/results/<id>`: signed-in owner detail; another account receives 404.
- `DELETE /api/results/<id>`: signed-in owner deletion with JSON `{}` body. Subscription expiry does not prevent deletion.

Responses use `Cache-Control: no-store`. Mutations require same-site JSON requests, bound the streaming body to 512 KiB and validate an explicit field allowlist. A snapshot contains 1–200 completed tracks; saving is rate limited to 30 requests per minute per identity. Audio duration and numeric measurements use the analyzer's supported ranges. Camelot is derived from the saved canonical musical key.

## In-memory sign-in handoff

The Saved Results sign-in prompt is shown only for an unauthenticated session. Signed-in accounts with no snapshots see an empty collection and an Analyze your first track link to /#workspace, including older authenticated sessions without a billing identity. Loading and request failures remain separate from empty collections. Downloading CSV alone does not create saved history.

Attempting to select Save Results without an eligible account opens Pricing through the client router, including for signed-out visitors. It does not visit the login page or canonicalize the browser hostname. The current completed workspace is temporarily retained in a root React provider; same-origin Pricing and email-login navigation can return to that draft. It is not persisted or backfilled to history. After returning with access, select the checkbox to enable saving for subsequent analyses. A browser refresh, tab closure, hostname change or full-page Google OAuth redirect clears the draft. CSV is the free way to retain an export before leaving.

## Verification

`npm test`, `npm run typecheck`, and `npm run build` cover the source checks. `node scripts/saved-results-check.mjs` verifies the real supplied MP3, free CSV, checkbox access, subsequent batch autosaves, no backfill/edit/filter writes, opt-out, lost-response retry idempotency, owner isolation, expiry, invalid requests, reload retrieval, deletion and responsive layouts without sending mail or creating a payment.

The browser check requires a local server explicitly started against `.cache/saved-results-verification.sqlite` using `AUTH_DATABASE_PATH`; never run its fixture setup against the live account database. The default check URL is `http://localhost:3001`. Use `BASE_URL` and matching `CHECK_DATABASE` to change it, and `--development` for a development server. Generated account/subscription/result fixtures are removed afterward. Unit tests also close and reopen a real SQLite file to verify persistence across database restarts.
