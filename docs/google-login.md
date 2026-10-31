# Google sign-in

The site uses NextAuth 4.24.15 with the Google OpenID Connect provider. Sign-in is optional; the audio tools remain available to guests. There is no user database or cloud audio/history storage.

## Local setup

The supplied Google web-client credentials have been placed in the ignored `.env.local` file. Keep this file on the server and do not copy it to `public/`. `.env.example` lists the required variables without values.

- `GOOGLE_CLIENT_ID`: Google OAuth web client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth web client secret.
- `NEXTAUTH_SECRET`: a generated random session secret. Keep it stable across restarts and instances.
- `NEXTAUTH_URL`: the canonical public origin, currently `http://localhost:3000`.

Run `npm run dev`, then visit `http://localhost:3000`. Opening Sign in from `127.0.0.1` switches the login page to `localhost`, matching the registered callback. Sessions belong to the canonical hostname, so continue using `localhost` after sign-in. Unsaved results are held in memory. Export CSV for free before a full-page OAuth redirect; with Pro, select the Save Results checkbox once signed in to automatically store subsequent analyses in account history. Audio files are never saved. See [saved-results.md](saved-results.md).

## Google Cloud and deployment

The supplied client lists these authorized redirect URIs:

```
http://localhost:3000/api/auth/callback/google
https://bpmfder.com/api/auth/callback/google
https://www.bpmfder.com/api/auth/callback/google
```

Choose one production origin and set `NEXTAUTH_URL` to that exact HTTPS origin in the host's server environment. Copy the client ID/secret securely and generate a separate strong production `NEXTAUTH_SECRET`. Example generation: `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"`.

The Google OAuth consent screen must be configured in the same project. If its audience is External and publishing status is Testing, add the intended Google accounts as test users. The supplied JSON does not expose the current consent-screen settings. No change to Google Cloud or production deployment was performed by this integration.

Use a Node.js/serverless deployment that supports Next.js Route Handlers; a static-file-only host cannot serve the OAuth callbacks. Restart the server after changing environment variables. Keep HTTPS enabled in production, with the canonical host forwarded correctly by the hosting platform.

## Session and data scope

Only `openid email profile` is requested. Google authorization is protected by PKCE, state and nonce, and the server verifies the ID token through the provider library. Unverified Google email profiles are rejected. The browser session endpoint exposes the basic name/email/image and expiry; provider access/refresh tokens are not added to the session response.

NextAuth keeps the encrypted session in an HttpOnly, SameSite=Lax cookie for seven days, renewed while active. HTTPS enables secure cookie prefixes and flags. Sign-out uses a CSRF-protected POST. Return URLs are limited to the homepage, Pricing and Blogs, including page anchors; external redirects and auth endpoints are rejected.

This adds Google authentication only. Email/password accounts are implemented separately; see `email-auth.md`. Google sign-in does not create a password account or link identities by matching email alone. Neither flow adds billing, saved results, subscription permissions or user administration. Names/email appear in the account dropdown; the avatar uses an initial instead of downloading an external profile image.

## Validation

Run `npm test`, `npm run build`, and `node scripts/auth-check.mjs` against the running local server. The auth check exercises anonymous sessions, CSRF, OAuth authorization parameters, failure handling, login layouts, encrypted-session reading, account menu/sign-out and absence of credentials in public assets. A successful real Google account authorization must be completed manually in the browser; tests do not use a person's Google credentials.
