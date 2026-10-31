# Homepage content optimization — 2026-10-28

## Intent and keyword map

Source: the user's Semrush US export, classified in `artifacts/keyword-strategy/classified.json`. Volumes describe that export, not a fresh live measurement. Similar upload/detection queries share one homepage rather than separate near-identical landing pages.

| Keyword | Export volume | Homepage placement |
| --- | ---: | --- |
| bpm finder | 49,500 | Title, H1, introductory copy |
| bpm key finder | 9,900 | Natural “BPM and key finder” in result explanation |
| tempo and key finder | 6,600 | Opening description |
| song bpm | 5,400 | Usage instructions and FAQ |
| tempo finder | 5,400 | Measurement methods |
| bpm detector | 4,400 | Automatic detection explanation |
| how to find the bpm of a song | 720 | How-to section heading |
| how many bpm is this song | 170 | FAQ question |

Related Tap Tempo and Camelot concepts receive short explanations and working links to existing tools/sections. `beat finder` has mixed song-identification intent and is not deliberately targeted. No support is implied for song-name searches, Spotify/YouTube input, BPM changing, or unavailable future routes.

## Research observations

- Tunebat Analyzer: https://tunebat.com/Analyzer — direct HTTP fetch returned 403. Search tool returned no usable content in this session; no current page content, accuracy or model-parity claims are treated as verified.
- BeatsPerMinuteOnline: https://www.beatsperminuteonline.com/ — direct HTTP fetch returned 403; no unseen content was used.
- LANDR Samples: https://samples.landr.com/key-bpm-finder — HTTP 200 returned a JavaScript app shell without readable tool content. No feature claims were inferred from the shell.
- WavMonopoly: https://wavmonopoly.com/bpm-finder/ redirected to https://wavmonopolyaudio.com/pages/pre-delay-calculator. Its current readable page provides concrete instructions, a worked numerical example and an explanation of how to use and listen-check results. This is an adjacent music calculator, not evidence of a current BPM finder or its capabilities. Adopted the general instructional approach with original BPM-specific copy.
- Google people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content — retrieved directly with HTTP 200. Content should complete a visitor's task and explain how a result is generated, without padded word counts or promises about rankings.
- VocalRemover direct retrieval returned 403; no unseen content was used. Samplab's previously exported URL redirected to an unrelated Apple 404; excluded as current evidence.

## Editorial and visual decisions

Keep the working analyzer above the guide. Replace vague benefits and instructional slogans with concrete steps, limits, result interpretation and controls that exist. Add automatic analysis / Tap Tempo / timed counting as distinct BPM measurement methods. Show the counting formula with an explicit arithmetic example. Explain ambiguity between half/double tempo and uncertain tonal content.

Preserve the approved ink-black, record-red, paper, pale-blue and label-yellow palette, existing typefaces and vinyl sleeve. Add compact section navigation, sequential instructions, an instructional yellow tempo-counting label and a three-column results glossary. No new demo audio, local persistence, export format or DSP changes.

Metadata is specific to the tool. Do not invent a production canonical domain, fake reviews or accuracy percentages. FAQ answers remain visible in semantic details elements, without promising FAQ rich results. All guide content must appear in the initial rendered HTML and remain readable without JavaScript.

## Verification

- Production build and TypeScript compilation pass; `/` is statically prerendered.
- Dedicated `scripts/homepage-content-check.mjs` passes with JavaScript disabled: title, description, exactly one H1, all guide sections and native expandable FAQ remain readable.
- Every fragment link resolves. Guide links switch the actual analyzer / Tap Tempo / metronome tabs. All nine FAQ answers support keyboard expansion/collapse.
- No horizontal overflow or clipped guide headings at375/390/768/1024/1440px; no page errors. Final screenshots saved under `artifacts/homepage/`. Desktop and mobile reviewed visually; fixed mobile FAQ heading spacing and inherited centered section labels.
- Existing `scripts/browser-check.mjs` passes: actual local audio analysis and playback, Tap Tempo, metronome, tempo correction, CSV export, memory-only results, no samples or JSON export, invalid files, privacy and mobile navigation. No external requests observed in that run.
- This is a local content/readability implementation and validation. Production indexation, impressions and ranking changes have not been measured.

## Illustrated tutorial follow-up — 2026-10-29

Added four screenshots of the actual application: file selection, completed BPM/key/Camelot results, the expanded tempo-correction menu, and Tap Tempo. Captured with `scripts/capture-tutorial.mjs` using the real analysis worker and a locally generated24-second track. The track returned124BPM/Aminor/8A; no worker mocks or altered measurement values were used. No audio was added to public assets or initial results.

The walkthrough now pairs each step's instructions with a readable screenshot. Copy names the actual file selector, filters, sort controls, three-dot menu, half/double controls, inspection action and CSV export. Native full-size image links work without JavaScript. A fourth screenshot supports the manual-tapping explanation.

Source PNGs and capture provenance are in `artifacts/tutorial-capture/`; four public WebP files total about158KiB. Next Image supplies responsive sizes, intrinsic aspect ratios and native lazy loading. Final production build and homepage verification pass, including all four images decoding, descriptive alt text, original guide interactions and375/390/768/1024/1440px bounds. Tutorial desktop/mobile and measurement screenshots visually reviewed.
