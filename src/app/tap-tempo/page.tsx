import Link from 'next/link';
import TapTempo from '@/components/tap-tempo';
import { ToolPage, RelatedTools, ResourceFooter, Questions } from '@/components/tool-page';
import StructuredData from '@/components/structured-data';
import { applicationSchema, pageMetadata } from '@/lib/site';
export const metadata = pageMetadata('/tap-tempo', 'Tap Tempo — Tap or Press Space to Find BPM', 'Tap along with a song to find its BPM. Use your spacebar or the tap pad, reset anytime, and compare the pulse with automatic audio analysis.');
export default function TapTempoPage() {
  return <><StructuredData value={applicationSchema('/tap-tempo', 'Tap Tempo', 'Measure tempo by tapping a button or pressing the spacebar.', ['Tap BPM counter', 'Spacebar input', 'Reset estimate'])} /><ToolPage eyebrow="A TOOL FOR FINDING THE PULSE" title="Tap Tempo" accent="Feel the beat." description="Hear a song. Follow its pulse. Tap the pad or press your spacebar to measure the tempo, without choosing an audio file.">
    <section className="standalone-tap page-width" aria-label="Tap tempo counter"><TapTempo /></section>
    <section className="resource-copy page-width"><div className="resource-heading"><span className="eyebrow">FOLLOW THE PULSE</span><h2>How to tap for BPM</h2></div><div className="resource-columns"><article><h3>Keep one tap for every beat.</h3><p>Play the music on your speakers or headphones. Find a steady pulse you could nod your head to, then tap the pad or press Space on each beat. You need two taps for the first number; keep going for a steadier estimate.</p></article><article><h3>Reset when you lose the rhythm.</h3><p>The counter averages the intervals between your latest taps, up to 12 at a time. A pause longer than 2.5 seconds starts a fresh estimate. Use Reset when you change songs or want to count a different pulse.</p></article><article><h3>Check the number against the music.</h3><p>Try the verse and chorus separately if the tempo changes. A groove can feel like 70 or 140 BPM depending on which beat you count. If you have the file, <Link href="/#workspace">use the automatic BPM finder</Link> for another measurement.</p></article></div></section>
    <section className="resource-callout page-width"><div><span className="eyebrow">THE MATH BEHIND THE TAP</span><h2>60,000 ÷ average interval</h2><p>Two taps 500 milliseconds apart give 120 BPM. The counter uses the time between the first and last taps in the current estimate, divided by the number of intervals.</p></div><span className="formula-example">500 <small>ms</small><span>→</span>120 <small>BPM</small></span></section>
    <Questions title="A few tapping questions." items={[
      ['Does Tap Tempo listen through my microphone?', 'No. It measures the timing of your taps. It does not listen to the music, record your microphone or identify a song.'],
      ['Why does my estimate keep moving?', 'Your tapping intervals naturally vary. Follow a clear, steady section for several beats. Reset after a missed beat rather than trying to correct it with extra taps.'],
      ['Can I tap a rhythm to find a song name?', 'This tool calculates tempo only. It does not match rhythms to a song database or identify a melody.'],
      ['Can I use it on a phone?', 'Yes. Tap the pad on each beat. On a computer, Space works while focus is on the page, and the focused pad also supports normal keyboard activation.'],
    ]} /><RelatedTools current="/tap-tempo" />
  </ToolPage><ResourceFooter /></>;
}
