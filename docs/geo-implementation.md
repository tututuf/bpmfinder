# GEO implementation — 2026-11-02

This change implements the on-site recommendations in `outputs/geo-audit-2026-11-02/GEO-ANALYSIS.md`. It does not establish search indexation or AI citation performance.

## Public content

- `/about` describes the actual project, the BPM Finder editorial byline, cited teaching sources, original examples and a correction contact. No individual credentials, legal identity or social profiles have been invented.
- `/analysis-methodology` explains local processing, each output, practical result checks, limitations and two downloadable teaching recordings. It links the existing component notices, manifest and dated verification record. The observed 120 BPM/A minor/C major examples are explicitly limited to their teaching context, not presented as a general accuracy rate.
- New pages render their complete text on the server, have canonical/Open Graph metadata, a responsive section index and footer links, and are included in the 17-URL public sitemap.
- Homepage copy now identifies the product and on-device processing directly. Existing article answers, publication dates, paid gates and audio estimates are preserved.

## Entity connections

`src/lib/site.ts` defines stable identifiers for the publisher (`/#organization`), website (`/#website`) and editorial byline (`/about#editorial`). Root-layout JSON-LD publishes their connected graph. WebApplication and BlogPosting records reference the publisher; all seven article bylines and the blog cards link to the visible editorial explanation. The blog list also exposes its seven entries as a CollectionPage/ItemList.

`sameAs` is intentionally absent until actual official profile URLs are supplied and verified. A project Organization author remains appropriate; Person markup should only be added if a real individual is credited and has a corresponding visible biography.

The existing `public/google17fab2ec21256fb7.html` verification file and production GA4 integration are preserved. File accessibility does not prove that a Search Console property has been verified or that pages have been indexed.

## HTTPS canonicalization

`cloudflare/canonical.ts` uses the request URL and the configured SITE_URL. On the canonical or www production hostname, HTTP and alternate-host requests receive a 308 to the canonical HTTPS origin with their path and query preserved. It does not trust forwarding headers and does not redirect localhost, loopback or workers.dev previews.

`assets.run_worker_first = true` is needed so static files pass through the same check as pages and R2 assets. After canonicalization, the existing OpenNext asset resolver serves static resources; the large-model R2 handler still supports GET, HEAD and ranges. This means static requests now invoke the Worker as well as assets, which can affect Worker request usage. No extra network fetch to an external origin is introduced by the canonicalization function.

Wrangler normally forwards local requests using the first configured custom-domain route. `dev.host = "127.0.0.1"` explicitly prevents that local rewrite from becoming a production-domain HTTPS redirect loop. It applies to local development, not deployed routing.

## Verification

```powershell
npm run typecheck
node --test --test-isolation=none tests/canonical-redirect.test.mjs
node scripts/geo-edge-check.mjs
npm run build:cloudflare
npm run preview:cloudflare -- --log-level error
$env:BASE_URL='http://127.0.0.1:3002'
node scripts/geo-check.mjs
```

The edge integration check bundles the actual Worker wrapper with downstream fixtures: HTTP/www redirects precede R2/OpenNext calls, local/canonical origins pass through, forwarding-header spoofing cannot cause a redirect loop, and R2 GET/HEAD ranges retain their behavior. This is a local integration check, not a live CDN test.

`geo-check.mjs` verifies all 17 public routes and connected schema, article author links, footer discovery, five responsive widths, valid section anchors, native audio playback/download, WAV hashes, the existing Google verification file and complete no-JavaScript text. It aborts analytics requests only inside its isolated browser test context.

The existing `scripts/seo-first-batch-check.mjs` now includes the two new sitemap routes and handles valid JSON-LD graphs. Run it against local Next development on port 3000 to test its Host-header redirect assertion, since Wrangler's explicit local upstream host differs. `geo-edge-check.mjs` separately tests production-host routing at the actual wrapper boundary.

Reports and screenshots are under `artifacts/geo/`. New report files are local artifacts; no test requests send email or initiate a payment.

## Account and off-site follow-up

After publication, use the authorized Search Console property to:

1. Confirm the property verification is complete and the HTTPS property matches the canonical site.
2. Submit or refresh `https://bpmfder.com/sitemap.xml` and inspect the homepage, `/about`, `/analysis-methodology` and key tutorials. Record indexing state and Google's selected canonical.
3. Check the current controls for inclusion in generative AI search features where available in the account. Their state was not inspected in this task.
4. Record a dated baseline of available performance data and actual cited URLs for a small set of relevant queries. Zero results from a single public search is not an indexation verdict.

Public brand profiles, demonstrations and community posts require real project accounts and their own posting authorization. They have not been created or posted by this change. Do not add fabricated endorsements or copy one backlink comment across unrelated discussions.

Publishing is separate from building. Once released, recheck HTTP/www redirects for a page, an image and the verification file; confirm the 17-URL sitemap and new pages on the live domain. Do not report the new pages as live based on a local preview.

## References

- Google: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?hl=en
- Google: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls?hl=en
- Cloudflare: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/

No llms.txt file, artificial word-count targets or automatic date refresh was added. These are not substitutes for useful content, accessible pages and verified search eligibility.
