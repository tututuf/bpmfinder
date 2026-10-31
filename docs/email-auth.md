# Email registration and password login

The `/login` page offers **Sign in** and **Create account** modes, plus the existing Google button. Registration sends a six-digit code through Resend. Submitting the email, code and password creates a verified account and signs in using NextAuth Credentials. If the final automatic sign-in fails, the page confirms account creation and offers password sign-in instead. Accounts are optional for the audio tools.

## Configuration

Use Node.js **24.13 or newer**. Add these server-only settings to the ignored `.env.local` (use deployment secrets in production):

```dotenv
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<keep the existing random secret>
RESEND_API_KEY=<Resend API key>
RESEND_FROM="BPM Finder <support@bpmfder.com>"
AUTH_DATABASE_PATH=.data/accounts.sqlite
AUTH_TRUSTED_IP_HEADER=
```

The supplied Resend account's `bpmfder.com` domain was verified with sending enabled. `support@bpmfder.com` is the user-confirmed From address. Replies require a working inbox or forwarding configured separately; sending-domain verification does not create an inbox. Keys are never prefixed with `NEXT_PUBLIC_`, returned in API responses or logged. `.env*` is ignored, except the empty `.env.example` template.

Existing Google variables are still needed for the Google button. Email/password login needs `NEXTAUTH_URL` and `NEXTAUTH_SECRET`; new registrations also need the Resend variables. Existing password accounts can still log in during an email-provider outage.

## Storage and deployment

SQLite tables are created on the first account request. The database defaults to `.data/accounts.sqlite`, with WAL sidecars in the same folder. `.data/` is ignored and must never go in `public/`. Back up the database consistently (use SQLite backup facilities or stop the process before copying the database and sidecars). Changing `AUTH_DATABASE_PATH` changes which accounts are available.

Local Node.js uses `.data/accounts.sqlite` on persistent disk. The Cloudflare deployment sets `STORAGE_BACKEND=cloudflare` and uses the private `APP_DATABASE` Durable Object binding for accounts, verification codes, rate limits, subscriptions and saved results. Business operations execute inside a synchronous SQLite transaction in that object. Cloudflare never uses a local filesystem database. See [Cloudflare deployment](cloudflare-deployment.md). Keep the auth origin on HTTPS in production and retain the configured Google callback URLs. The local origin is `http://localhost:3000`.

Only set `AUTH_TRUSTED_IP_HEADER` when the hosting proxy is trusted, overwrites that header and blocks direct bypass to the origin. For example, `cf-connecting-ip` is appropriate only when all requests are enforced through Cloudflare. With no trusted header configured, source limits deliberately use one shared bucket rather than trusting a spoofable forwarded header. Email-specific limits always apply. Configure the trusted proxy before a public launch to avoid unnecessarily sharing source limits across visitors.

## Behavior and limits

- Codes use cryptographic random generation, expire after 10 minutes, work once, and permit five incorrect attempts. Resending after 60 seconds replaces the old code. Undelivered/failed codes cannot create accounts; the cooldown remains in place.
- Codes are stored as an HMAC tied to the email, using `NEXTAUTH_SECRET`; plaintext codes exist only while composing/delivering the mail and in the recipient's email. Rotating this secret invalidates pending codes and existing JWT sessions.
- Passwords require only a nonempty string, with no minimum length or character-composition rules. The account endpoint's overall 4 KiB request limit still applies. Passwords use salted scrypt (`N=32768, r=8, p=1`, 64-byte output). Passwords and their hashes never appear in sessions. Unknown-account password checks still perform a password derivation.
- Account creation and code consumption are atomic SQLite transactions. Existing password accounts cannot be overwritten by registration. Codes are activated only after the mail API accepts the send.
- Code requests allow 10 per email per day and 30 per source per hour. Registration allows 10 attempts per email and 30 per source per 15 minutes. Password sign-in allows 10 attempts per email and 80 per source per 15 minutes. Source/email limit keys are HMACs. Counters persist across restarts.
- Account JSON endpoints require the canonical Origin, reject cross-site requests, require JSON and cap the body at 4 KiB. NextAuth provides CSRF protection for credentials sign-in and session logout.
- Successful registration requires access to the mailbox. Code-request responses use the same success message for new/existing accounts; password errors do not identify which credential failed.
- Google continues to validate Google email verification. Google identity and password accounts are not silently linked. There is no password-reset flow or account deletion UI in this change.
- Audio stays on the device and unsaved results remain in page memory. Pro members can select Save Results to automatically keep subsequent analysis results in their account; see [saved-results.md](saved-results.md). Audio is never stored.

## Verification

```sh
npm test
npm run typecheck
npm run build
# Run with the local development server up:
node scripts/email-auth-check.mjs --live-mail
node scripts/auth-check.mjs
```

`email-auth-check` sends **one** verification message to a generated `delivered+label@resend.dev` official test recipient, reads only that message via the full-access Resend key, completes registration and password login through the real UI, and removes its generated account/code in `finally`. It never emails a real person or prints the code/password. It checks input/Origin/CSRF, resend cooldown, invalid code/password, consumed codes, salted account storage, session shape, logout/login and 375–1440px layouts. Screenshots and a redacted report go to `artifacts/email-auth/`. Per-source protective limits remain after the test; avoid running live checks repeatedly. A send-only production key cannot read the test message; use unit tests and manual mailbox verification for such keys.

Provider acceptance is verified through Resend's test inbox. Delivery to individual Gmail/Outlook inboxes and spam placement still require checking a real mailbox.
