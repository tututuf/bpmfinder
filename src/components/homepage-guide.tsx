import TutorialScreenshot from '@/components/tutorial-screenshot';
import Link from 'next/link';
import { RelatedTools } from '@/components/tool-page';
import KeyFinderGuide from '@/components/key-finder-guide';
import { ArrowRight, AudioLines, Headphones, Keyboard, Music2, Plus, ShieldCheck } from 'lucide-react';
import selectAudio from '../../public/images/tutorial/select-audio.webp';
import readResults from '../../public/images/tutorial/read-results.webp';
import checkTempo from '../../public/images/tutorial/check-tempo.webp';
import tapTempo from '../../public/images/tutorial/tap-tempo.webp';

type Tool = 'analyzer' | 'tap' | 'metronome';

const faqs = [
  ['What does BPM mean in music?', 'BPM stands for beats per minute: how many underlying beats fit in one minute. A steady 120 BPM pulse has two beats each second. BPM describes tempo, while musical key describes the tonal center.'],
  ['How do I calculate BPM manually?', 'Count the beats over a timed interval, then multiply by 60 and divide by the seconds counted. For example, 30 beats in 15 seconds gives 120 BPM. Count for longer if you need a steadier check, or use Tap Tempo to time the intervals between your taps.'],
  ['How many BPM is this song?', 'Choose the audio file in the analyzer to estimate its BPM. If you only have a song playing on another service, open Tap Tempo and tap along with the beat. This tool measures audio you select or a rhythm you tap; it does not look up songs by title.'],
  ['Why does the BPM detector show 60 instead of 120 BPM?', 'Some rhythms can be counted at half or double tempo. A sparse drum pattern might suggest 60 BPM while you feel the same music at 120 BPM. Listen to the track, compare it with Tap Tempo or the metronome, then use ½× or 2× in the track menu if needed. These controls correct the displayed result; they do not change audio speed.'],
  ['Can I analyze an entire song?', 'Yes. BPM and key analysis cover the full audio file, rather than just three excerpts. Each file can be up to 10 minutes long and 50 MB. Longer files and the optional Pro danceability and happiness models take more time. Keep the tab open until analysis finishes.'],
  ['How accurate are BPM and musical key estimates?', 'Clear, steady beats are easier to measure than live drumming, tempo changes or sparse percussion. Key estimates can disagree when a track changes key or has little pitched sound. A drum loop may have no clear musical key at all. Undetermined means no usable key candidate was produced. Inspect the result and confirm it by ear before using it in a set.'],
  ['What is Camelot notation?', 'Camelot is a DJ notation for musical keys: numbers 1–12 with A for minor and B for major. As a starting point for a transition, try the same code, a neighboring number with the same letter, or the same number with the other letter. For example, 8A can pair with 7A, 9A or 8B. The numbers wrap from 12 to 1. Check each mix by ear.'],
  ['Are my audio files uploaded anywhere?', 'No. Your browser decodes and analyzes each file on your device. Audio is never sent to a server. Results stay in memory while this page is open and are cleared when you refresh or close it. Export CSV for free before leaving, or select Pro’s Save Results checkbox before analysis to add new results to your account history. Audio files are never saved.'],
  ['Which audio formats can I use?', 'MP3, WAV, FLAC, M4A, AAC, OGG, OPUS and AIFF files can be selected. Your browser must also support the file’s actual codec. Each file can be up to 50 MB and 10 minutes long, and you can add up to 20 files at a time. If a file cannot be decoded, try a WAV or MP3 version.'],
  ['Can I find BPM from a Spotify or YouTube link?', 'Link analysis is not supported. Select an audio file you already have permission to use, or play the song separately and measure its beat with Tap Tempo. Tapping gives you a tempo estimate, not a musical key or a song identification.'],
  ['Can I use BPM Finder for free?', 'Yes. BPM, key and Camelot analysis, Tap Tempo, and the metronome are free without an account. CSV export is free too. Save Results and Energy, Dance and Happy scores require Pro. You can preview your selected files, sort and filter the results, and edit an estimated BPM or key while the page is open.'],
];

export default function HomepageGuide({ onToolSelect }: { onToolSelect: (tool: Tool) => void }) {
  return <div className="homepage-guide">
    <div className="benefits page-width" aria-label="Why BPM Finder">
      <div><span className="benefit-icon"><AudioLines /></span><div><h3>Whole-track tempo detection</h3><p>Measure song BPM across the full file, from the intro through the final beat.</p></div></div>
      <div><span className="benefit-icon"><Music2 /></span><div><h3>Key & Camelot together</h3><p>Compare musical keys and plan transitions for your next DJ set.</p></div></div>
      <div><span className="benefit-icon"><ShieldCheck /></span><div><h3>Your files stay on your device</h3><p>Audio stays in your browser. Export CSV for free, or save results to your account with Pro.</p></div></div>
    </div>

    <nav className="guide-nav page-width" aria-label="BPM guide sections">
      <span>THE FIELD GUIDE</span>
      <a href="#how-it-works">How to use it</a>
      <a href="#measure-bpm">Measure BPM</a>
      <a href="#song-key-finder">Find a key</a>
      <a href="#understand-results">Learn the basics</a>
      <a href="#questions">FAQs</a>
    </nav>

    <section className="how-section" id="how-it-works" aria-labelledby="how-title">
      <div className="page-width">
        <div className="section-heading"><span className="eyebrow">FROM FILE TO FIRST MIX</span><h2 id="how-title">How to find the BPM of a song</h2><p>Follow the steps below to analyze your audio, read the results and check the tempo before your next mix.</p></div>
        <ol className="usage-steps">
          <li><div className="usage-copy"><span className="usage-number">STEP 01 / SELECT</span><h3>Select your audio files</h3><p>Click <strong>Select audio files</strong>, or drag your tracks into the dotted area. The BPM detector and key analysis run across the full audio, locally in your browser.</p><ul><li>MP3, WAV, FLAC and other supported formats.</li><li>Up to 20 files per batch, 50 MB and 10 minutes per file.</li></ul><a className="guide-link" href="#workspace" onClick={() => onToolSelect('analyzer')}>Choose your tracks <ArrowRight size={15} /></a></div><TutorialScreenshot image={selectAudio} original="select-audio" alt="BPM Finder file selection area with the Select audio files button, supported formats and the Pro insights link." caption="Choose files or drop them into the analyzer" /></li>
          <li><div className="usage-copy"><span className="usage-number">STEP 02 / READ</span><h3>Read your BPM & key</h3><p>Once analysis finishes, each file appears in <strong>Your tracks</strong>. Read its BPM, musical key and Camelot code together, then press the play icon to check what you hear.</p><ul><li>Search your tracks or filter by key status.</li><li>Use the sort menu to compare tempo or Camelot.</li></ul><p className="usage-tip">Open a track to adjust its BPM or musical key.</p></div><TutorialScreenshot image={readResults} original="read-results" alt="Completed audio analysis showing Studio groove at 124 BPM, A minor and Camelot 8A, with search, key filter and sorting controls." caption="Find tempo, key and Camelot in the results row" /></li>
          <li><div className="usage-copy"><span className="usage-number">STEP 03 / CHECK & KEEP</span><h3>Check the tempo. Keep your results.</h3><p>Open the <strong>three-dot menu</strong> beside a track. Use <strong>½×</strong> or <strong>2×</strong> if the rhythm feels half or twice as fast, or choose <strong>Inspect & edit result</strong> to review the BPM and key.</p><ul><li>Use Reset estimate to undo a tempo correction.</li><li>Export CSV is free. Pro members can select the Save Results checkbox to automatically keep new analysis results in their account history.</li></ul><p className="usage-tip">Edits change the displayed results. Your audio file stays unchanged.</p></div><TutorialScreenshot image={checkTempo} original="check-tempo" alt="Track menu expanded to show Inspect and edit result, half-tempo and double-tempo controls, and Reset estimate; Export CSV is above the results." caption="Review and adjust an estimate; export CSV for free" /></li>
        </ol>
        <p className="tutorial-source-note">Screenshots show the actual tool with a generated audio file. Results depend on the audio you select.</p>
        <a className="guide-link" href="#workspace" onClick={() => onToolSelect('analyzer')}>Analyze your audio <ArrowRight size={16} /></a>
      </div>
    </section>

    <section className="measurement-section page-width" id="measure-bpm" aria-labelledby="measurement-title">
      <div className="section-heading"><span className="eyebrow">LISTEN FOR THE PULSE</span><h2 id="measurement-title">Three ways to measure BPM</h2><p>BPM means beats per minute: the pace of the underlying beat. At 120 BPM, you hear two beats each second. Count the pulse you would tap your foot to, rather than every note or hi-hat hit.</p></div>
      <div className="measurement-layout">
        <div className="measurement-methods">
          <article><AudioLines size={21} aria-hidden="true" /><div><h3>Use the automatic tempo finder</h3><p>Have the audio file? Select it for a whole-track estimate. This is useful for checking a folder of loops or comparing songs before a mix.</p><a className="guide-link" href="#workspace" onClick={() => onToolSelect('analyzer')}>Find BPM from a file <ArrowRight size={15} /></a></div></article>
          <article><Keyboard size={21} aria-hidden="true" /><div><h3>Tap along with the music</h3><p>Play the song separately, open Tap Tempo and tap the button or spacebar on each beat. Keep a steady rhythm over several taps, then reset if you lose the pulse.</p><TutorialScreenshot image={tapTempo} original="tap-tempo" alt="Tap Tempo interface with a BPM estimate, Tap the beat button, spacebar shortcut and reset control." caption="Tap the button or press your spacebar" compact /><a className="guide-link" href="#workspace" onClick={() => onToolSelect('tap')}>Open Tap Tempo <ArrowRight size={15} /></a></div></article>
        </div>
        <article className="counting-card"><span className="counting-label"><span /> THE MANUAL CHECK</span><h3>Count the beats.<br />Do the math.</h3><p>Count beats over a timed interval, then convert that count to one minute.</p><div className="bpm-formula">BPM = beats counted × 60 ÷ seconds</div><div className="counting-example"><span>30 beats in 15 seconds</span><strong>30 × 4 = <em>120</em> <span>BPM</span></strong></div><p className="counting-note">Count for 30 or 60 seconds for a longer check. If the tempo drifts, measure another section too.</p></article>
      </div>
      <aside className="tempo-check"><Headphones size={21} aria-hidden="true" /><p><strong>Does the result feel half as fast?</strong> A 70 BPM pulse can also be felt at 140 BPM. Listen for the beat you want to mix to, then compare it with the <a href="#workspace" onClick={() => onToolSelect('metronome')}>metronome</a>. Use ½× or 2× in a track’s menu to adjust the number.</p></aside>
    </section>

    <KeyFinderGuide onAnalyze={() => onToolSelect('analyzer')} />

    <section className="result-guide-section" id="understand-results" aria-labelledby="result-guide-title"><div className="page-width">
      <div className="section-heading"><span className="eyebrow">LEARN / THE BASICS</span><h2 id="result-guide-title">What your BPM and key results mean</h2><p>A good transition starts with two questions: do the beats line up, and do the notes sound good together? BPM tells you about the pace. Musical key and Camelot help you compare the harmony.</p></div>
      <div className="result-glossary">
        <article><span className="result-label">BPM</span><h3>The pace of the beat</h3><p>Beats per minute describes how fast the underlying pulse moves. At 120 BPM, there are two beats each second. Similar tempos give you a starting point for beatmatching or choosing a practice speed. One estimate cannot describe every tempo change in a song.</p></article>
        <article><span className="result-label">MUSICAL KEY</span><h3>The tonal home</h3><p>A key such as A minor or C major describes a tonal center. Try related keys when layering samples or planning a transition. Open a track to review key candidates; percussion-only audio may have little tonal evidence.</p></article>
        <article><span className="result-label">CAMELOT</span><h3>A shorthand for mixing</h3><p>Camelot represents keys with numbers 1–12 and a letter: A for minor, B for major. Start with the same code, a neighboring number with the same letter, or the same number with the other letter. The numbers wrap from 12 to 1.</p></article>
      </div>
      <div className="mixing-example">
        <div><span className="eyebrow">PUT IT INTO PRACTICE</span><h3>What could follow a track in 8A?</h3><p>If your track is in A minor (8A), these are useful places to start. Preview the transition and listen for clashing notes or vocals. Phrasing and arrangement still matter.</p></div>
        <dl className="key-pairings"><div><dt><span>8A</span><span aria-hidden="true">→</span><strong>8A</strong></dt><dd>Stay in the same key</dd></div><div><dt><span>8A</span><span aria-hidden="true">→</span><strong>7A / 9A</strong></dt><dd>Try a neighboring number</dd></div><div><dt><span>8A</span><span aria-hidden="true">→</span><strong>8B</strong></dt><dd>Explore the relative major</dd></div></dl>
      </div>
      <div className="basics-next"><div><h3>Check the pulse before you mix</h3><p>If a track feels twice as fast as its result, compare it with Tap Tempo or a metronome. You can adjust the displayed BPM with ½× or 2× in the track menu.</p></div><div><a className="guide-link" href="#workspace" onClick={() => onToolSelect('tap')}>Check with Tap Tempo <ArrowRight size={15} /></a><a className="guide-link" href="#workspace" onClick={() => onToolSelect('metronome')}>Hear the metronome <ArrowRight size={15} /></a></div></div>
      <p className="estimate-note">All detection results are estimates. You can inspect and edit them without changing your audio file. Pro danceability and happiness scores are model estimates, not measured facts about a song’s mood.</p>
    </div></section>

    <section className="homepage-next page-width"><div><span className="eyebrow">GO A LITTLE DEEPER</span><h2>From a tempo to your next transition.</h2><p>Use the <Link href="/camelot-wheel">Camelot wheel</Link> to compare related keys, then <Link href="/bpm-to-ms">convert BPM to delay times</Link> when you are back in the studio.</p></div></section>
    <RelatedTools current="/" />
    <section className="faq-section page-width" id="questions" aria-labelledby="faq-title"><div className="faq-intro"><span className="eyebrow">BEFORE YOU PRESS PLAY</span><h2 id="faq-title">BPM Finder <span>questions, answered.</span></h2><p>File limits, tempo checks and what to do when an estimate needs a second listen.</p><a className="guide-link" href="#workspace" onClick={() => onToolSelect('analyzer')}>Back to the analyzer <ArrowRight size={16} /></a></div><div className="faq-list">{faqs.map(([q, a]) => <details key={q}><summary>{q}<Plus size={17} aria-hidden="true" /></summary><p>{a}</p></details>)}</div></section>
  </div>;
}
