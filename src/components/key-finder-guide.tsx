import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function KeyFinderGuide({ onAnalyze }: { onAnalyze: () => void }) {
  return <section className="home-key-section page-width" id="song-key-finder" aria-labelledby="song-key-title">
    <div className="home-key-copy"><span className="eyebrow">THE HARMONY BEHIND THE BEAT</span><h2 id="song-key-title">Song Key Finder.<br /><span>Find your track’s tonal home.</span></h2><p>The same audio analyzer finds musical key alongside BPM. Upload a song, loop or sample to see a major or minor key and its Camelot code, then listen before choosing your next transition.</p>
      <ol className="home-key-steps"><li><strong>Choose your audio.</strong><span>Select a supported file in the analyzer above. BPM, musical key and Camelot are calculated together.</span></li><li><strong>Read the key and Camelot.</strong><span>A label such as A minor describes the musical key. Its Camelot equivalent, 8A, gives you a shorthand for mixing.</span></li><li><strong>Check it by ear.</strong><span>Play the track and open its result to review or edit the key. Camelot updates with the label; a percussion-only loop may have no clear tonal center.</span></li></ol>
      <div className="home-key-links"><a className="guide-link" href="#workspace" onClick={onAnalyze}>Find the key of your audio <ArrowRight size={15} /></a><Link className="guide-link" href="/blogs/how-to-find-key-of-a-song">Learn to check a song’s key <ArrowRight size={15} /></Link></div>
    </div>
    <aside className="home-key-reference" aria-label="Musical key and Camelot notation example"><div className="home-key-label"><span>KEY NOTATION / AN EXAMPLE</span><span aria-hidden="true">♮</span></div><div className="home-key-name"><strong>A</strong><span>minor</span></div><div className="home-key-notes" aria-label="A minor chord notes: A, C, E"><span>A</span><span>C</span><span>E</span></div><div className="home-key-code"><span>CAMELOT</span><strong>8A</strong></div><p>One musical key, two ways to read it. <Link href="/camelot-wheel">Explore the Camelot wheel →</Link></p></aside>
  </section>;
}
