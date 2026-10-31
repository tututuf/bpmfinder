'use client';
import { useCallback, useEffect, useState } from 'react';
import { AudioLines, Fingerprint, Keyboard, RotateCcw } from 'lucide-react';
import { nextTapTimes, tempoFromTaps } from '@/lib/music-tools';

export default function TapTempo() {
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const tap = useCallback(() => setTapTimes(all => nextTapTimes(all, performance.now())), []);
  const bpm = tempoFromTaps(tapTimes);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const element = event.target as HTMLElement;
      if (event.code !== 'Space' || event.repeat || element.closest('input, button, textarea, a, summary, [role="combobox"], [role="listbox"], [contenteditable="true"]')) return;
      event.preventDefault(); tap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tap]);
  return <div className="secondary-tool tap-tool">
    <div className="tool-intro"><span className="eyebrow">FIND IT BY FEEL</span><h2>Tap into<br />the rhythm.</h2><p>Play a song and tap along with the beat.<br />Use your spacebar or the pad to find its tempo.</p><span className="tap-instruction"><Keyboard size={15} aria-hidden="true" /> One tap for every beat.</span></div>
    <div className="tap-controls"><div className="tap-readout"><div className="tap-readout-label"><span>Your tempo</span><AudioLines size={16} aria-hidden="true" /></div><div className="tempo-number" aria-live="polite" aria-atomic="true">{bpm || '—'}<span>BPM</span></div><p className="tap-hint">{tapTimes.length === 0 ? 'Start tapping to find the pulse.' : tapTimes.length === 1 ? 'One more tap to find the tempo.' : 'Keep tapping with the beat.'}</p></div>
      <button className="tap-pad" aria-label="Tap the beat" onClick={tap}>{!!tapTimes.length && <span key={tapTimes.at(-1)} className="tap-pad-pulse" aria-hidden="true" />}<Fingerprint size={30} strokeWidth={1.5} aria-hidden="true" /><strong>Tap the beat</strong><kbd aria-hidden="true">SPACE</kbd></button>
      <div className="tap-footer"><span className="tap-count">{tapTimes.length} {tapTimes.length === 1 ? 'tap' : 'taps'}<span> in this estimate</span></span><button className="tap-reset" disabled={!tapTimes.length} onClick={() => setTapTimes([])}><RotateCcw size={13} aria-hidden="true" /> Reset</button></div>
    </div>
  </div>;
}
