# Privacy Policy — version 1.1

Route: `/privacy`. Effective and last updated: November 1, 2026. The 12 sections adapt the user-supplied Waffo privacy template to this application's verified behavior. Reference: https://docs.waffo.ai/mor/account-reviews/privacy-policy.md (retrieved November 1, 2026).

## Scope and evidence

- Audio decoding, DSP and CLAP inference run in browser workers (`public/commercial-analysis.mjs`, `public/commercial-mood.mjs`). Transformers browser caching is enabled for model assets, not recordings. Unsaved results are held in memory; CSV is a local download. No server audio-upload or training use was introduced.
- `src/lib/auth.ts` uses encrypted JWT sessions with a 7-day maximum age, renewable during activity. Google scopes are `openid email profile`; verified email is required. NextAuth sets necessary session, callback, CSRF and short-lived OAuth cookies.
- Email accounts store salted scrypt password hashes (`account-security.ts`). Codes expire after 10 minutes; code and rate-limit cleanup is request-triggered (`account-store-core.ts`), not a scheduled purge. Resend receives the recipient and verification-email content (`mail.ts`).
- The saved-result allowlist stores track names, measurements and analysis metadata, not audio (`saved-result-data.ts`). Saved records remain owner-accessible after Pro expiry. The Save Results checkbox applies to subsequent completed results; clearing the workspace does not delete history.
- Checkout shares email, buyer identity and plan information with Waffo. Our database stores order/payment/subscription status and event records, not full card numbers/CVC. This page does not enable checkout or change provider settings.
- Cloudflare hosts Workers, Durable Object storage and model/cache R2 assets. Observability is enabled and the live site has a Cloudflare performance beacon; therefore the policy does not claim zero telemetry or zero network processing. No advertising pixels or Google Analytics were found in application source.

Provider notices verified on November 1, 2026: https://www.cloudflare.com/privacypolicy/, https://developers.cloudflare.com/web-analytics/about/, https://policies.google.com/privacy, https://resend.com/legal/privacy-policy, https://www.waffo.com/en/privacy-policy. Snapshots and browser reports stay in ignored `artifacts/privacy/`.

## Deliberate boundaries

The user previously instructed us not to display legal operator name, address or registration/operating country. This preference is carried forward from Terms. The public page uses BPM Finder and support@bpmfder.com. This differs from the template's controller-identification checklist; it is not a representation that merchant-review or jurisdiction-specific disclosure requirements have been satisfied.

No unsupported certifications, signed transfer contracts, employee agreements, scheduled security audits, fixed billing/log retention years, cookie dashboard, marketing preference controls, account-deletion automation or guaranteed breach-notification deadline were invented. Applicable-law deadlines are used for rights/breach requests. Account deletion is a support request. Unverified fixed retention periods and provider deployment regions are not guessed.

## Integration and validation

The homepage Privacy button now uses a Next Link to the policy; its redundant modal copy is removed while the accuracy dialog remains. Shared resource, Blogs and Pricing footers, login disclosure, pre-checkout pricing note and Terms section 11 link to the policy. Canonical/OG metadata and sitemap include `/privacy` (15 public URLs).

Validation covers type checking, Cloudflare production build, all 12 section links, policy tables, five viewport widths, sticky contents, same-document navigation/header preservation, footer/login/Terms links, no-JavaScript content and live HTTP/canonical/sitemap checks. No actual emails, purchases or privacy requests are sent during validation.

## November 1 cleanup

At the user's request, remove whole template sections that lack supplied supporting information, rather than displaying blank fields or substitutes. Removed the standalone operator/controller section because no legal identity/address was supplied; removed the unused marketing section and speculative future marketing workflow; removed unsupported transfer-mechanism boilerplate and implementation-absence wording. Remaining sections and contents are renumbered 01–12. Known support contact, actual data practices and privacy rights remain. No legal identity, address, DPO or placeholder fields are rendered. Version 1.1.
