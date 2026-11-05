# DJ mistakes article publication

Publication date: November 6, 2026.

The article is served at /blogs/common-dj-mistakes using the existing FieldNote
template. Its entry in newBlogPosts adds it to the blog list, related reading,
CollectionPage schema and the public sitemap. The title puts the topic before
the BPM Finder brand. The earlier authorized homepage title edits are included
in this release.

The published page retains the source-based draft's ten mistakes, practice
routine, FAQ, project author, AI assistance disclosure, correction contact and
experience limitations. It cites eight external sources and one original audio
measurement record. Its three players reuse the existing October 31 click
recordings; no audio assets or analysis behavior were regenerated.

Public evidence:

- /audio/field-notes/dj-mistakes-evidence.json
- /audio/field-notes/verify-dj-mistakes.mjs
- The existing manifest, verification notes and three stereo WAV files.

The reproduction script reads local WAV files, measures onset intervals, checks
the original manifest hashes and writes AUDIO-EVIDENCE.json. Downloading the
script, manifest and WAV files into an isolated folder reproduces the published
JSON exactly. The measurements illustrate fixed offset and tempo drift; they
are not a hardware test, professional DJ review or analyzer accuracy benchmark.

Validation uses the Cloudflare production build and Worker preview, the article
browser checks at 1440/768/390/375 pixels, the eighteen-route GEO checks, source
anchor/schema mapping, no-JavaScript rendering, audio playback/download and
public evidence byte checks. Screenshots of the new article, mobile table and
method note were visually inspected. Reports live under the ignored directory
artifacts/dj-mistakes-release.

Deploy the already-built bundle using the existing deployment script. Preserve
production bindings, billing settings, secrets and database migrations. Verify
the live URL, blog discovery, sitemap and downloadable evidence after release;
a successful local build alone is not evidence of live publication.
