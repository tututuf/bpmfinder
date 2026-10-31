# SEO first batch — 2026-10-31

Implementation of the approved first batch from `outputs/seo-plan-2026-10-31/SEO-STRATEGY.md`. Each destination owns a task and a related keyword group; spelling variants and duplicate intents do not receive separate routes.

## Published local routes

| Route | Purpose | Distinct content/function |
| --- | --- | --- |
| `/` | BPM finder / tempo detector | Existing full-file audio analyzer; BPM definition, upload walkthrough, automatic/tapping/manual measurement, half/double tempo, FAQs and links to related tasks |
| `/tap-tempo` | Tap BPM / spacebar counter | Immediately usable tap pad; averages the latest 12 taps, reset/pause behavior, keyboard/touch support, no microphone |
| `/#song-key-finder` | Song key detection from audio, merged into home | One dedicated H2 section with steps, key/Camelot notation example and same-page analyzer CTA. `/key-finder` permanently redirects here. |
| `/camelot-wheel` | Camelot reference and harmonic mixing | Interactive 24-key SVG with custom select and arrow-key control; same/neighbor/relative keys, complete server-rendered chart and enharmonic names |
| `/bpm-to-ms` | Tempo/time conversion | Bidirectional BPM ↔ quarter-note ms; note lengths, dotted/triplet durations, seconds/BPS and live reference table |
| `/blogs/how-to-find-key-of-a-song` | Learning how to determine key | Original tutorial covering audio, listening, chords, scores and checking disagreements; actual UI screenshots and prominent key tool links |
| `/blogs` | Article discovery | Real published article card and retained homepage guide links |
| `/pricing` | Free and Pro plans | Existing pricing and billing behavior; self-canonical/share metadata |

Metronome has its existing homepage tab. A separate metronome route and the future tools from the strategy are not published in this batch. No empty catalog, genre or artist pages were generated. Existing keyword strategy files and source workbook were not changed.

## Indexing and URL controls

- `SITE_URL` is the public SEO origin, default `https://bpmfder.com`. It is deliberately independent of local `NEXTAUTH_URL`.
- `src/lib/site.ts` holds metadata helpers and the public route whitelist. All seven public destinations have unique titles/descriptions, self-canonicals, Open Graph URLs/images and Twitter cards.
- The homepage root may serialize as `https://bpmfder.com` in canonical metadata and `https://bpmfder.com/` in sitemap XML; these resolve to the same root URL. Subpages preserve their own paths.
- `/sitemap.xml` includes exactly the seven public destinations. There is no artificial build-time `lastmod`, private data, future route or parameter variation in the map.
- `/robots.txt` allows public crawling, excludes `/api/` and references the canonical sitemap. Existing private-page `noindex` directives remain readable.
- A host-scoped permanent 308 redirects `www.bpmfder.com` to the chosen bare canonical host, retaining paths/query strings. A configured `www` origin reverses the alternate-host direction. Localhost is never redirected by this rule. HTTPS enforcement and TLS certificates still belong to the production edge/hosting configuration.
- Optional `GOOGLE_SITE_VERIFICATION` renders a Search Console verification meta tag when configured. No token is invented; Search Console submission, ownership verification and GA4 configuration have not been performed.

## Structured data and content

- Homepage/tap/calculator pages describe their free functions with `WebApplication`; paid mood/history features are not described as free.
- The article has `BlogPosting` with the actual publication date and an editorial organization byline. No invented personal credentials, review counts or rating claims.
- Standalone resource tools include visible breadcrumbs and `BreadcrumbList`.
- FAQs remain readable page content. There is no promise of FAQ rich-result eligibility.
- New tools link to each other through task-specific cards. Homepage links to the key tutorial; the article links to the key tool and wheel. Tool variants have distinct copy and workflows, with self-canonicals.
- A locally generated 1200×630 PNG at `/images/bpm-finder-social.png` matches the established record-sleeve palette.

Primary references checked on 2026-10-31:

- Ableton Learning Music, “Keys and scales”: https://learningmusic.ableton.com/notes-and-scales/keys-and-scales.html
- Ableton Learning Music, “Minor scales”: https://learningmusic.ableton.com/notes-and-scales/minor-scales.html
- Mixed In Key, “Camelot Wheel”: https://mixedinkey.com/camelot-wheel/

The independent wheel uses the project's existing canonical key-to-Camelot conversion. Third-party reference text/assets were not copied. The reference site is not an implementation dependency or affiliation.

## Behavior retained

The analysis engine, model selection and estimator policy are unchanged. The supplied percussion loop still returns the current engine's D major / 10B candidate; this SEO batch does not claim to resolve the earlier competitor B-major discrepancy. Key/Camelot edits are propagated into free CSV output. Pro still gates Energy/Dance/Happy in all environments. Save Results remains prospective, default-off and authenticated; production requires Pro. No new local persistence or demonstration audio was added.

## Verification

- `npm run typecheck`
- `node --test --test-isolation=none tests/*.test.mjs`: 75 passing tests. Single-process isolation avoids this environment's child-process sandbox restriction; the same test files run.
- `npm run build`: production build passes and includes the four new routes, populated Blogs, sitemap and robots.
- `node scripts/seo-first-batch-check.mjs`: metadata/canonicals, sitemap/robots/host redirect, no-JavaScript content, 24 key selections and SVG keyboard focus, calculator decimal/inverse/invalid input, deterministic 120 BPM tapping, supplied real MP3 on the homepage, edit/Camelot/CSV, Pro locks and guest Save Results navigation, screenshot dialog and internal tool navigation.
- Browser layouts checked at 375, 390, 768 and 1440px, with screenshots under `artifacts/seo-first-batch/`.
- `node scripts/navigation-check.mjs`: Pricing/Blogs navigation, persistent header DOM nodes, hashes, back/forward, mobile and no-JavaScript navigation checks pass.
- `node scripts/browser-check.mjs`: existing homepage upload/playback/editing/export/Tap Tempo/metronome/empty-state and responsive regressions pass, zero page errors or third-party requests.

After deployment, set the final `SITE_URL`, verify edge HTTPS/canonical hosts, validate the production sitemap in Search Console, then capture indexing and query/page baselines. No ranking or traffic gains can be measured from the local implementation alone.

## Follow-up: Key Finder consolidation

On 2026-10-31 the user chose to merge the key tool into the homepage. Its dedicated analyzer variant and route were removed. The homepage now owns the key-finder group through `#song-key-finder` under a single H2; the instructional article remains independent. All active links target the homepage or its workspace, the old URL uses a permanent 308, auth return paths normalize to home, and the sitemap contains seven public routes. This supersedes the original separate-key-page decision in the dated strategy; source keyword/SERP evidence is preserved.
