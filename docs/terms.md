# Terms of Service page

`/terms` adapts the supplied Waffo subscription template (V1), with 16 numbered sections, version 1.0 and an effective/updated date of November 1, 2026. The source template was supplied by the user and checked against `https://docs.waffo.ai/mor/account-reviews/tos.md`.

## Confirmed choices

- The user explicitly requested that legal operator name, registered address and operating/registration country not be displayed. The page uses BPM Finder and the existing support mailbox. It does not invent an entity, address, jurisdiction, phone number or arbitration forum. This differs from the provider template's identification checklist; the page does not claim to satisfy all merchant-review or jurisdiction-specific disclosure requirements.
- First paid subscription: a full refund may be requested within seven calendar days of the first charge, for monthly or yearly plans, without a usage quota. It does not reset on renewal or repeat purchase.
- Additional remedies cover confirmed duplicate/incorrect charges, a verified interruption on our side exceeding 72 consecutive hours and mandatory legal refund rights. Billing/refund requests use `support@bpmfder.com`; response/processing times are service targets, with payment-provider settlement timing distinguished.
- Cancellation follows the existing signed-in Pricing → Cancel renewal flow. Cancellation stops future renewals and preserves the current paid period. Existing saved snapshots remain accessible after Pro ends.

## Implementation boundaries

The page describes browser analysis and local CLAP inference, account information, Resend email delivery, Google authentication, Cloudflare hosting/performance processing and Waffo payments. It does not promise automatic cancellation-confirmation emails, annual renewal reminders, a 90-day purge. Section 11 summarizes data handling and links to the separate `/privacy` policy, added on November 1, 2026. Open-source license rights are preserved.

Footer links were added on the homepage, shared resource pages, Blogs and Pricing; login links to the Terms beside the sign-in flows. Pricing links directly to billing, cancellation and refunds and includes a matching refund FAQ. The sitemap and canonical metadata include `/terms`. The pricing-card payment-provider badge remains removed; naming the processor within legal terms is a separate disclosure.

This change does not enable checkout, create a refund endpoint, send emails, migrate accounts or alter billing access. Refund handling remains a support/provider operation. Before enabling sales, the Waffo store/hosted checkout refund policy should match the published policy, and any merchant-review requirements must be addressed separately. No remote Waffo store policy was modified as part of this page request.

## Validation

Type checking and the Cloudflare production build validate the route and imports. Browser verification covers all 16 sections/anchors, fixed desktop/tablet/mobile viewports, sticky contents, client navigation with a persistent header, mobile footer links, pricing and login entry points, sitemap metadata and complete no-JavaScript text. Reports/screenshots are kept locally under ignored `artifacts/terms/`.
