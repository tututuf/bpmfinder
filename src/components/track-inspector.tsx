'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ArrowRight, RotateCcw, AudioLines } from 'lucide-react';
import Link from 'next/link';
import { LockKeyhole } from 'lucide-react';
import { camelotFor } from '../../public/analysis-policy.mjs';
import { type Track } from '@/lib/result-data';
import KeySelect from './key-select';

type Props = { track: Track; premium?: boolean; onClose: () => void; onSave: (bpm: number | null, key: string) => void; onReset: () => void };
export default function TrackInspector({ track, premium = false, onClose, onSave, onReset }: Props) {
  const [bpm, setBpm] = useState(track.bpm?.toString() || '');
  const [key, setKey] = useState(track.key);
  const panel = useRef<HTMLElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) close.current();
      if (event.key !== 'Tab') return;
      const controls = panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, a[href]');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('keydown', keyboard); before?.focus(); };
  }, []);
  const metric = (label: string, value: number | null | undefined, explanation: string) => <div className="insight-metric"><span>{label}</span><strong className="mono">{value ?? '—'}{value !== null && value !== undefined && <small>/100</small>}</strong><div className="metric-meter" aria-hidden="true"><i style={{ width: `${value ?? 0}%` }} /></div><p>{explanation}</p></div>;
  const validBpm = bpm === '' || Number.isFinite(Number(bpm)) && Number(bpm) >= 20 && Number(bpm) <= 400;
  return <div className="modal-backdrop" onClick={onClose}><section ref={panel} className="track-inspector" role="dialog" aria-modal="true" aria-label={`Track details: ${track.name}`} onClick={e => e.stopPropagation()}>
    <button className="icon-button modal-close" aria-label="Close track details" onClick={onClose}><X size={21} /></button>
    <span className="eyebrow"><AudioLines size={14} /> TRACK ANALYSIS</span><h2>{track.name}</h2>
    <p className="inspector-subtitle">{track.engine || (track.demo !== undefined ? 'Generated reference track' : 'Saved estimate')} · {track.analyzedSeconds ? `${track.analyzedSeconds.toFixed(1)} seconds ${track.analysisScope === 'full' ? '· full audio analyzed' : 'sampled'}` : `${track.duration.toFixed(1)} seconds`}{track.analyzedOffset ? ` from ${track.analyzedOffset.toFixed(1)}s` : ''}</p>
    {!!track.warnings?.length && <div className="analysis-warnings">{track.warnings.map(warning => <p key={warning}>{warning}</p>)}</div>}
    <form onSubmit={event => { event.preventDefault(); if (validBpm) onSave(bpm ? Number(bpm) : null, key); }}>
      <div className="inspector-edit"><label>Tempo <span className="field-input"><input aria-label="Track BPM" type="number" min="20" max="400" step="0.1" value={bpm} onChange={e => setBpm(e.target.value)} /><span>BPM</span></span></label><KeySelect value={key} onChange={setKey} /><div className="camelot-preview"><span>Camelot</span><strong className="mono">{camelotFor(key)}</strong></div></div>
      <p className="tempo-evidence">{track.tempoReference ? `Independent tempo estimate: ${track.tempoReference} BPM · ${track.tempoStatus}.` : 'Use your ears to confirm the tempo.'} Changes apply to this result; your audio file stays unchanged.</p>
      {!!track.keyCandidates?.length && <div className="candidate-section"><h3>Alternative keys</h3><p>Select a key to update this result.</p><div className="candidate-list">{track.keyCandidates.map(candidate => <button type="button" key={candidate.key} className={key === candidate.key ? 'chosen' : ''} onClick={() => setKey(candidate.key)}><strong>{candidate.key}</strong><span className="mono">{candidate.camelot}</span><ArrowRight size={14} /></button>)}</div></div>}
      {premium ? <><div className="insight-metrics">{metric('Energy · signal', track.energy, 'RMS level mapped from −60 to 0 dBFS. Measures signal level, not perceived musical intensity.')}{metric('Danceability', track.danceability, track.analysisEngine === 'commercial' ? 'Relative audio match to danceable versus non-danceable descriptions. An estimate, not a probability.' : 'Model score for the danceable class. An estimate, not a guarantee.')}{metric('Happiness', track.happiness, track.analysisEngine === 'commercial' ? 'Relative audio match to happy versus sad descriptions. Describes the sound, not the listener.' : 'Model score for the happy class. Describes musical mood, not the listener.')}</div>
      <div className="measurement-notes"><span>{track.rmsDb !== undefined ? `RMS ${track.rmsDb} dBFS · Peak ${track.peakDb} dBFS · Crest ${track.crestDb} dB` : 'Reanalyze this track with Pro to get signal measurements.'}</span><span>{track.moodPatches ? `Mood models ${track.analysisScope === 'full' ? 'covered' : 'sampled'} ${track.moodSeconds}s · ${track.moodPatches} windows` : `Mood analysis: ${track.moodStatus || 'not run'}`}</span></div></> : <div className="inspector-pro"><span className="pro-label"><LockKeyhole size={13} /> PRO INSIGHTS</span><h3>There’s more to a track than its tempo.</h3><p>Unlock Energy, Dance & Happy to explore its intensity, danceability and musical mood.</p><div className="locked-insights">{['Energy', 'Dance', 'Happy'].map(label => <span key={label}>{label}<LockKeyhole size={15} aria-hidden="true" /></span>)}</div><Link href="/pricing">Explore Pro <ArrowRight size={15} /></Link></div>}
      {!!track.keyObservations?.length && <details className="profile-details"><summary>See key profile results</summary><div>{track.keyObservations.map((observation, index) => <p key={index}><span>{track.analysisScope === 'full' ? 'Full audio' : `Section ${observation.segment}`} · {observation.duration}s · {observation.profile}</span><strong>{observation.key} {observation.scale}</strong></p>)}</div></details>}
      <div className="inspector-actions"><button type="button" className="text-button" onClick={() => { setBpm((track.originalBpm !== undefined ? track.originalBpm : track.bpm)?.toString() || ''); setKey(track.originalKey || track.key); onReset(); }}><RotateCcw size={13} /> Restore estimates</button><button className="primary-button" disabled={!validBpm}>Save changes <ArrowRight size={15} /></button></div>
    </form>
  </section></div>;
}
