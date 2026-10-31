# Song key article: evidence and reproduction

Updated 2026-10-31. Route: `/blogs/how-to-find-key-of-a-song`. Strengthens the existing URL; no additional page targeting the same intent.

## Claim-to-source map

|Reference|Primary source|Scope supported in the article|
|---|---|---|
|1|[Ableton — Keys and scales](https://learningmusic.ableton.com/notes-and-scales/keys-and-scales.html)|Tonic, musical center and major scale|
|2|[Ableton — Minor scales](https://learningmusic.ableton.com/notes-and-scales/minor-scales.html)|Major/minor interval differences; C major and A natural minor share notes|
|3|[University of Puget Sound — Major Key Signatures](https://musictheory.pugetsound.edu/mt21c/MajorKeySignatures.html)|Major key signature reference, sharps and flats|
|4|[University of Puget Sound — Minor Key Signatures](https://musictheory.pugetsound.edu/mt21c/MinorKeySignatures.html)|Relative minor, raised seventh and dominant resolution in minor|
|5|[Mixed In Key — Camelot Wheel](https://mixedinkey.com/camelot-wheel/)|Camelot notation reference only; no endorsement, affiliation or inference about competitor algorithms|

All five source pages were directly read on 2026-10-31. The article paraphrases explanations, uses inline numbered links and describes each source's contribution in its bibliography. Competitor articles informed the editorial gap assessment, not the evidence for music theory claims. No invented authorship credentials, expert review or external validation.

## Original examples and actual tool observations

The original generator `scripts/generate-key-lesson.mjs` creates sine-based chord voicings, bass and beat-root pulses without external audio samples. Two 16-second WAVs use mono 16-bit PCM at 22,050 Hz, A4=440 Hz, 12-tone equal temperament. One 4/4 bar per chord at 120 BPM; four bars repeated twice.

|File|Composed progression|Unedited browser result on 2026-10-31|SHA-256|
|---|---|---|---|
|`c-major-lesson.wav`|C–F–G–C ×2|C major, 8B, 120 BPM, 16 sec|`77cfcf626c94336889b8c634e6dc41cc2eb37690be948ffb72e64c3631935006`|
|`a-minor-lesson.wav`|Am–Dm–E–Am ×2|A minor, 8A, 120 BPM, 16 sec|`973c85859742cf19b13fd201884a3993123fc4c5d89f2bc745fd5923ac013acf`|

The browser used `/analysis-worker.mjs?v=commercial-clap-2`. Original composed intent and observed output are separately recorded. E major in the minor progression deliberately includes G♯; the listening example does not claim to use only A natural minor notes. The keyboard figure independently illustrates the natural-minor/relative-major relationship.

Reproduce from the repo root with the development server running:

```powershell
node scripts/generate-key-lesson.mjs
node scripts/capture-key-lesson.mjs
node scripts/key-article-check.mjs
```

The capture script uses normal homepage controls, the real analysis worker and free CSV export. It does not mock analysis, edit labels or change accounts. Observed results must match the published walkthrough, otherwise the capture check fails for editorial review. Screenshots refresh the shared upload image and add a result image tied to the downloadable minor example. Browser output and CSV are in `artifacts/key-lesson/`; reader-facing notes, hashes and observations are at `/audio/key-lesson/verification.txt`.

The two files are intentionally clear teaching material. They do not establish general accuracy on commercial recordings, polyphonic songs, changing keys or percussion. Later engine versions may return different estimates; the public verification record and article state the actual check date.

## Presentation and access

- All explanatory text, tables, inline references and keyboard diagrams are server rendered.
- Native audio controls use `preload="none"`, without autoplay. Download links provide the identical checked WAVs.
- Sources appear in visible content and BlogPosting citations; two AudioObject entries match the actual recordings.
- The same key article URL/canonical is preserved. Existing tool links use Next Link and keep the shared header.
- Screenshots use the existing image dialog. No new homepage demonstration audio, result persistence, analysis algorithm or billing changes.

## Validation

`scripts/key-article-check.mjs` covers citation/section anchor targets, schema matching, actual audio playback, WAV download hashes/headers/duration, public verification record, screenshot dialog/Escape, no-JavaScript HTML, same-document tool navigation and 375/390/768/1440 layouts. Typecheck and all 75 existing unit tests pass. Production verification is recorded in the session progress log.
