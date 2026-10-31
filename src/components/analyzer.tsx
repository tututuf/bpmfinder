'use client';

import Link from 'next/link';
import FooterContact from '@/components/footer-contact';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useSaveWorkspace } from '@/components/save-workspace-provider';
import { useResultAutosave } from '@/components/use-result-autosave';

import { useState, useEffect, useRef } from 'react';
import { ArrowDown, ArrowDownToLine, ArrowRight, AudioLines, Check, CircleHelp, Clock3, Heart, Keyboard, ListMusic, LoaderCircle, LockKeyhole, Minus, MoreHorizontal, Music2, Pause, Play, Plus, RotateCcw, Search, SlidersHorizontal, Trash2, Upload, X } from 'lucide-react';
import type { AnalysisEngine } from '@/lib/analysis-config';
import TrackInspector from '@/components/track-inspector';
import CustomSelect from '@/components/custom-select';
import HomepageGuide from '@/components/homepage-guide';
import TapTempo from '@/components/tap-tempo';
import HeroArtwork from '@/components/hero-artwork';
import Brand from '@/components/brand';
import { useBilling } from '@/components/billing-provider';
import { resultForAccess } from '../../public/analysis-access.mjs';
import { useInterfaceMotion } from '@/lib/motion';
import { resultCsv, hasKeyEstimate, type Track } from '@/lib/result-data';
import { camelotFor, keyResult } from '../../public/analysis-policy.mjs';

type Analysis = Partial<Track> & Pick<Track, 'bpm' | 'key' | 'camelot' | 'waveform'>;
type Tool = 'analyzer' | 'tap' | 'metronome';
const KEY_FILTER_OPTIONS = [{ value: 'all', label: 'All keys' }, { value: 'known', label: 'Key identified' }, { value: 'unavailable', label: 'No key detected' }];
const SORT_OPTIONS = [{ value: 'added', label: 'Order added' }, { value: 'bpm-asc', label: 'BPM: low to high' }, { value: 'bpm-desc', label: 'BPM: high to low' }, { value: 'name', label: 'Track name' }, { value: 'key', label: 'Camelot' }];
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;


function Waveform({ values, small = false }: { values?: number[]; small?: boolean }) {
  return <div className={`waveform ${small ? 'small' : ''}`} aria-hidden="true">{(values || Array.from({ length: 70 }, (_, i) => Math.max(0.1, (Math.sin(i * 1.87) * 0.25 + 0.45) * Math.sin(Math.PI * (i + 4) / 78) + Math.abs(Math.cos(i * 0.57)) * 0.3))).map((v, i) => <i key={i} style={{ height: `${Math.max(9, v * 100).toFixed(2)}%`, opacity: (0.45 + v * 0.55).toFixed(2) }} />)}</div>;
}

export default function Analyzer({ configuration }: { configuration: { engine: AnalysisEngine; version: string; moodSampleRate: number; workerUrl: string } }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const saveOwner = useRef(session?.billingIdentity); saveOwner.current = session?.billingIdentity;
  const workspaceDraft = useSaveWorkspace();
  const { hasPro, developmentSavingUnlocked, refresh: refreshBilling } = useBilling();
  const premiumRef = useRef(hasPro); premiumRef.current = hasPro;
  const motionRoot = useRef<HTMLDivElement>(null);
  const [tracks, setTracks] = useState<Track[]>(() => workspaceDraft.current?.tracks || []);
  const [tool, setTool] = useState<Tool>('analyzer');
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [guide, setGuide] = useState<'A note on accuracy' | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [playTime, setPlayTime] = useState(0);

  const [metroBpm, setMetroBpm] = useState(120);
  const [metroOn, setMetroOn] = useState(false);
  const [beat, setBeat] = useState(0);
  const [extended, setExtended] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('added');
  const [keyFilter, setKeyFilter] = useState('all');
  const [inspecting, setInspecting] = useState<string | null>(null);
  useInterfaceMotion(motionRoot, [tool], '#tool-panel > .secondary-tool', true);
  useInterfaceMotion(motionRoot, [guide, inspecting], '.guide-modal, .track-inspector');
  useInterfaceMotion(motionRoot, [notice], '.toast');
  useInterfaceMotion(motionRoot, [activeMenu], '.track-menu');
  useInterfaceMotion(motionRoot, [playing], '.audio-player');
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urls = useRef(new Map<string, string>());
  const files = useRef(workspaceDraft.current?.files || new Map<string, File>());
  const queue = useRef<{ id: string; file: File }[]>([]);
  const running = useRef(false);
  const cancelled = useRef(new Set<string>());
  const worker = useRef<Worker | null>(null);
  const currentJob = useRef<{ id: string; reject?: (error: Error) => void } | null>(null);
  const history = useResultAutosave({
    owner: sessionStatus === 'authenticated' ? session?.billingIdentity || '' : '', hasPro, developmentSavingUnlocked, refresh: refreshBilling,
    requestAccess: () => {
      workspaceDraft.current = { tracks: tracks.filter(track => track.status === 'ready'), files: new Map(files.current) };
      router.push('/pricing');
    },
  });

  useEffect(() => {
    workspaceDraft.current = null;
    // Remove results retained by older versions; this version keeps results in memory.
    try { localStorage.removeItem('bpmfinder-results'); } catch { /* Storage may be unavailable. */ }
    return () => { worker.current?.terminate(); audioRef.current?.pause(); urls.current.forEach(url => URL.revokeObjectURL(url)); };
  }, []);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 5500); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => {
    if (!activeMenu) return;
    const close = () => setActiveMenu(null); document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [activeMenu]);
  useEffect(() => {
    if (!guide) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setGuide(null);
      if (guide && e.key === 'Tab') {
        const controls = document.querySelectorAll<HTMLElement>('.guide-modal button, .guide-modal a[href], .guide-modal input');
        const first = controls[0], last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };
    window.addEventListener('keydown', close); return () => { window.removeEventListener('keydown', close); previousFocus?.focus(); };
  }, [guide]);

  const patchTrack = (id: string, patch: Partial<Track>) => setTracks(all => all.map(t => t.id === id ? { ...t, ...patch } : t));
  async function runQueue() {
    if (running.current) return;
    running.current = true;
    while (queue.current.length) {
      const job = queue.current.shift()!;
      if (cancelled.current.has(job.id)) continue;
      currentJob.current = { id: job.id };
      patchTrack(job.id, { status: 'processing', message: 'Reading audio…' });
      const premium = premiumRef.current;
      const analysisOwner = saveOwner.current || '';
      const includeMood = premium && extended;
      let context: AudioContext | null = null;
      try {
        context = new AudioContext();
        const decoded = await context.decodeAudioData(await job.file.arrayBuffer());
        if (decoded.duration > 600) throw new Error('Tracks can be up to 10 minutes long. Trim this file and try again.');
        if (cancelled.current.has(job.id)) continue;
        const duration = decoded.duration, sampleRate = 11025;
        const offset = 0;
        const resample = async (rate: number) => {
          const offline = new OfflineAudioContext(1, Math.ceil(duration * rate), rate);
          const source = offline.createBufferSource(); source.buffer = decoded; source.connect(offline.destination);
          source.start(0, offset);
          return (await offline.startRendering()).getChannelData(0);
        };
        const [mono, tonal, mood] = await Promise.all([resample(sampleRate), configuration.engine === 'legacy' ? resample(44100) : Promise.resolve(new Float32Array()), includeMood ? resample(configuration.moodSampleRate) : Promise.resolve(new Float32Array())]);
        if (cancelled.current.has(job.id)) continue;
        patchTrack(job.id, { duration: decoded.duration, message: 'Finding the beat & key…' });
        const result = await new Promise<Analysis>((resolve, reject) => {
          const w = worker.current || new Worker(configuration.workerUrl, { type: 'module' }); worker.current = w;
          const timer = setTimeout(() => { w.terminate(); worker.current = null; reject(new Error('Analysis took too long. Try a shorter track.')); }, 120000 + Math.ceil(duration * 1500));
          currentJob.current = { id: job.id, reject: error => { clearTimeout(timer); w.terminate(); reject(error); } };
          w.onmessage = e => {
            if (e.data.progress) { patchTrack(job.id, { message: e.data.progress }); return; }
            clearTimeout(timer); if (e.data.error) reject(new Error(e.data.error)); else resolve({ ...e.data.result, ...keyResult(e.data.result?.key) });
          };
          w.onerror = () => { clearTimeout(timer); w.terminate(); worker.current = null; reject(new Error('Audio analysis could not start. Refresh and try again.')); };
          w.postMessage({ samples: mono.buffer, tonalSamples: tonal.buffer, moodSamples: mood.buffer, sampleRate, extended: includeMood, premium }, [mono.buffer, tonal.buffer, mood.buffer]);
        });
        if (!cancelled.current.has(job.id)) {
          const completed = { id: job.id, name: job.file.name.replace(/\.[^.]+$/, ''), ...resultForAccess(result, premium && premiumRef.current), originalBpm: result.bpm, originalKey: result.key, originalCamelot: result.camelot, analyzedSeconds: duration, analyzedOffset: offset, duration: decoded.duration, status: 'ready' as const, message: undefined } as Omit<Track, 'color'>;
          patchTrack(job.id, completed);
          await history.completed({ ...completed, color: 'blue' }, analysisOwner);
        }
      } catch (error) {
        if (!cancelled.current.has(job.id)) patchTrack(job.id, { status: 'error', message: error instanceof Error && error.name !== 'EncodingError' ? error.message : 'This audio format could not be read. Try a WAV or MP3 file.' });
      } finally { await context?.close().catch(() => {}); currentJob.current = null; }
    }
    running.current = false;
  }
  function addFiles(selected: File[]) {
    if (!selected.length) return;
    const accepted = selected.slice(0, 20).filter(f => {
      if (!/\.(mp3|wav|wave|flac|m4a|aac|ogg|oga|opus|aiff|aif|webm)$/i.test(f.name) && !f.type.startsWith('audio/')) { setNotice('Choose an audio file, such as MP3, WAV or FLAC.'); return false; }
      if (f.size > 50 * 1024 * 1024) { setNotice(`${f.name} is larger than 50 MB. Try a smaller file.`); return false; } return true;
    });
    if (selected.length > 20) setNotice('Added the first 20 files. You can add another batch when these finish.');
    const added = accepted.map(file => {
      const id = crypto.randomUUID(); files.current.set(id, file); queue.current.push({ id, file });
      return { id, name: file.name.replace(/\.[^.]+$/, ''), artist: file.name.split('.').pop()?.toUpperCase(), duration: 0, bpm: null, key: '—', camelot: '—', color: ['violet', 'peach', 'blue'][Math.floor(Math.random() * 3)], status: 'queued' as const, waveform: [] };
    });
    if (added.length) {
      setTracks(all => [...all, ...added]);
      setSearch(''); setKeyFilter('all'); setTool('analyzer'); void runQueue();
    }
  }
  function reanalyzePremium() {
    if (!premiumRef.current || running.current) return;
    const selected = tracks.filter(track => track.status === 'ready' && track.energy === undefined && files.current.has(track.id));
    for (const track of selected) queue.current.push({ id: track.id, file: files.current.get(track.id)! });
    setTracks(all => all.map(track => selected.some(item => item.id === track.id) ? { ...track, status: 'queued' as const } : track));
    void runQueue();
  }
  function removeTrack(id: string) {
    cancelled.current.add(id);
    if (currentJob.current?.id === id) { currentJob.current.reject?.(new Error('Cancelled')); worker.current?.terminate(); worker.current = null; }
    if (playing === id) { audioRef.current?.pause(); setPlaying(null); }
    const url = urls.current.get(id); if (url) URL.revokeObjectURL(url); urls.current.delete(id); files.current.delete(id);
    setTracks(all => all.filter(t => t.id !== id)); setActiveMenu(null);
  }
  function clearTracks() { tracks.forEach(t => removeTrack(t.id)); worker.current?.terminate(); worker.current = null; setInspecting(null); setSearch(''); setKeyFilter('all'); setNotice('Workspace cleared.'); }
  async function playTrack(track: Track) {
    if (playing === track.id) { audioRef.current?.pause(); setPlaying(null); return; }
    audioRef.current?.pause();
    let url = urls.current.get(track.id);
    if (!url) { const file = files.current.get(track.id); if (!file) return; url = URL.createObjectURL(file); urls.current.set(track.id, url); }
    const audio = new Audio(url); audioRef.current = audio;
    audio.ontimeupdate = () => setPlayTime(audio.currentTime);
    audio.onended = () => { setPlaying(null); setPlayTime(0); };
    try { await audio.play(); setPlaying(track.id); setPlayTime(0); } catch { setNotice('Playback could not start. Try choosing the file again.'); setPlaying(null); }
  }
  async function exportResults() {
    const includeInsights = hasPro ? (await refreshBilling()).hasPro : false;
    const ready = visibleTracks.filter(t => t.status === 'ready');
    const content = resultCsv(ready, includeInsights);
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
    const a = document.createElement('a'); a.href = url; a.download = 'bpmfinder-results.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice(`Exported ${ready.length} track${ready.length === 1 ? '' : 's'} to CSV.`);
  }
  useEffect(() => { if (tool !== 'metronome') setMetroOn(false); }, [tool]);
  useEffect(() => {
    if (!metroOn) return;
    const context = new AudioContext(); let count = 0, next = context.currentTime + 0.04;
    void context.resume();
    const schedule = () => {
      while (next < context.currentTime + 0.12) {
        const index = count % 4, osc = context.createOscillator(), gain = context.createGain();
        osc.frequency.value = index === 0 ? 1100 : 760; gain.gain.setValueAtTime(0.2, next); gain.gain.exponentialRampToValueAtTime(0.001, next + 0.045);
        osc.connect(gain); gain.connect(context.destination); osc.start(next); osc.stop(next + 0.05);
        const timer = setTimeout(() => { setBeat(index); timers.delete(timer); }, Math.max(0, (next - context.currentTime) * 1000)); timers.add(timer);
        next += 60 / metroBpm; count++;
      }
    };
    const timers = new Set<ReturnType<typeof setTimeout>>(); schedule(); const timer = setInterval(schedule, 30);
    return () => { clearInterval(timer); timers.forEach(clearTimeout); void context.close(); };
  }, [metroOn, metroBpm]);

  const readyCount = tracks.filter(t => t.status === 'ready').length;
  const busy = tracks.some(t => t.status === 'queued' || t.status === 'processing');
  const playingTrack = tracks.find(t => t.id === playing);
  const inspectedTrack = tracks.find(t => t.id === inspecting);
  const visibleTracks = tracks.filter(t => `${t.name} ${t.key} ${t.camelot}`.toLowerCase().includes(search.trim().toLowerCase()) && (keyFilter === 'all' || keyFilter === 'unavailable' && t.status === 'ready' && !hasKeyEstimate(t) || keyFilter === 'known' && hasKeyEstimate(t)))
    .sort((a, b) => sortBy === 'bpm-asc' ? (a.bpm ?? Infinity) - (b.bpm ?? Infinity) : sortBy === 'bpm-desc' ? (b.bpm ?? -Infinity) - (a.bpm ?? -Infinity) : sortBy === 'name' ? a.name.localeCompare(b.name) : sortBy === 'key' ? a.camelot.localeCompare(b.camelot, undefined, { numeric: true }) : 0);

  return <div ref={motionRoot} >
    <main>
      <section className="hero page-width">
        <div className="hero-copy"><div className="eyebrow"><span /> FREE ONLINE BPM & KEY FINDER</div>
          <h1>BPM Finder.<br />Know your <span>music.</span></h1>
          <p>Find song BPM, musical key and Camelot from your audio files. Analyze a track, check the tempo and export your results to CSV for free.</p>
          <div className="hero-checks"><span><Check /> Free to use</span><span><Check /> No sign-up</span><span><Check /> Just your browser</span></div>
        </div>
        <HeroArtwork>
          <div className="record-card"><div className="record-top"><span className="record-label"><span className="mini-dot" /> TRACK INSIGHTS</span><AudioLines size={18} /></div>
            <div className="record-title"><div className="vinyl"><div /></div><div><strong>Your music starts here</strong><span>Add a track to discover its sound</span></div></div>
            <Waveform /><div className="record-stats"><div><strong>—</strong><span>BPM</span></div><div><strong>—</strong><span>Musical key</span></div><div><strong>—</strong><span>Camelot</span></div></div>
          </div>
        </HeroArtwork>
      </section>

      <section className="workspace page-width" id="workspace" aria-label="Audio workspace">
        <div className="tool-bar"><div className="tool-tabs" role="tablist" aria-label="Audio tools" onKeyDown={e => {
          const choices: Tool[] = ['analyzer', 'tap', 'metronome']; const index = choices.indexOf(tool);
          const next = e.key === 'ArrowRight' ? choices[(index + 1) % choices.length] : e.key === 'ArrowLeft' ? choices[(index + choices.length - 1) % choices.length] : e.key === 'Home' ? choices[0] : e.key === 'End' ? choices[choices.length - 1] : null;
          if (next) { e.preventDefault(); setTool(next); document.getElementById(`tab-${next}`)?.focus(); }
        }}>
          <button id="tab-analyzer" role="tab" aria-selected={tool === 'analyzer'} aria-controls="tool-panel" className={tool === 'analyzer' ? 'selected' : ''} onClick={() => setTool('analyzer')}><AudioLines size={17} /> BPM & key finder</button>
          <button id="tab-tap" role="tab" aria-selected={tool === 'tap'} aria-controls="tool-panel" className={tool === 'tap' ? 'selected' : ''} onClick={() => setTool('tap')}><Keyboard size={17} /> Tap tempo</button>
          <button id="tab-metronome" role="tab" aria-selected={tool === 'metronome'} aria-controls="tool-panel" className={tool === 'metronome' ? 'selected' : ''} onClick={() => setTool('metronome')}><SlidersHorizontal size={17} /> Metronome</button>
        </div><span className="local-tag"><LockKeyhole size={12} /> 100% on your device</span></div>
        <input ref={inputRef} className="visually-hidden" type="file" multiple accept="audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aiff" aria-label="Select audio files" onChange={e => { addFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />
        <div id="tool-panel" role="tabpanel" aria-labelledby={`tab-${tool}`}>
        {tool === 'analyzer' && <div className="upload-wrapper"><div className={`dropzone ${dragging ? 'dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(Array.from(e.dataTransfer.files)); }}>
          <div className="upload-icon"><Upload size={25} /><span><Music2 size={12} /></span></div>
          <h2>{dragging ? 'Drop it like it’s hot.' : 'Drop your tracks. Find your rhythm.'}</h2>
          <p>Drag & drop your audio files here, or choose them below.</p>
          <button className="primary-button" onClick={() => inputRef.current?.click()}><Plus size={17} /> Select audio files <ArrowRight size={16} /></button>
          <div className="format-line">MP3, WAV, FLAC, M4A & more <span>·</span> 50 MB · 10 min per file</div>
        </div><div className="analysis-options">{hasPro ? <label><input type="checkbox" checked={extended} disabled={busy} onChange={e => setExtended(e.target.checked)} /><span>Include danceability & happiness <small>Pro model estimates · takes a little longer</small></span></label> : <Link className="analysis-pro-link" href="/pricing"><LockKeyhole size={15} /><span>Energy, Dance & Happy <small>Discover more about your tracks with Pro</small></span><strong>Explore Pro <ArrowRight size={13} /></strong></Link>}<label className="save-results-option"><input type="checkbox" aria-label="Save Results" aria-describedby="save-results-hint" checked={history.enabled} disabled={history.checking || sessionStatus === 'loading'} onChange={event => void history.toggle(event.target.checked)} /><span><span className="save-option-title">Save Results <span className="export-pro-label">PRO</span>{history.checking && <LoaderCircle size={12} className="spin" />}</span><small id="save-results-hint">Automatically add new analysis results to your history</small></span></label></div></div>}
        {tool === 'tap' && <TapTempo />}
        {tool === 'metronome' && <div className="secondary-tool"><div className="tool-intro"><span className="eyebrow">KEEP YOUR OWN TIME</span><h2>A little help staying in time.</h2><p>Set your tempo, press play, and settle into the beat.<br />Four beats to a bar. The first one leads the way.</p></div><div className="metronome-controls"><div className="tempo-stepper"><button aria-label="Decrease tempo" onClick={() => setMetroBpm(v => Math.max(40, v - 1))}><Minus size={18} /></button><label><input aria-label="Metronome BPM" type="number" min="40" max="240" value={metroBpm} onChange={e => setMetroBpm(Math.max(40, Math.min(240, Number(e.target.value) || 40)))} /><span>BPM</span></label><button aria-label="Increase tempo" onClick={() => setMetroBpm(v => Math.min(240, v + 1))}><Plus size={18} /></button></div><input aria-label="Tempo slider" type="range" min="40" max="240" value={metroBpm} onChange={e => setMetroBpm(Number(e.target.value))} /><div className="beat-dots">{[0, 1, 2, 3].map(i => <i key={i} className={metroOn && beat === i ? 'on' : ''} />)}</div><button className="primary-button" onClick={() => setMetroOn(!metroOn)}>{metroOn ? <Pause size={16} /> : <Play size={16} />} {metroOn ? 'Stop metronome' : 'Start metronome'}</button></div></div>}
        </div>
      </section>

      <section className="results page-width" aria-label="Analysis results"><div className="results-heading"><div><h2>Your tracks <span>{tracks.length}</span>{busy && <LoaderCircle size={16} className="spin" />}</h2><p>{tracks.length ? 'Open a track to inspect its analysis and make corrections.' : 'Your next great mix starts with a track.'}</p></div><div className="result-actions">{tracks.length > 0 && <button className="clear-button" onClick={clearTracks}>Clear all</button>}<button className="outline-button" aria-label="Export CSV" title="Download your visible results as CSV — free" disabled={!visibleTracks.some(t => t.status === 'ready')} onClick={exportResults}><ArrowDownToLine size={14} /> Export CSV</button></div></div>
        {history.error && <p className="save-result-error" role="alert">{history.error}{history.enabled && history.failedCount > 0 && <button disabled={history.retrying || history.saving > 0} onClick={() => void history.retry()}>{history.retrying ? 'Retrying…' : 'Retry saving'}</button>}</p>}
        {(history.savedCount > 0 || history.saving > 0) && <p className="save-result-confirmation" role="status">{history.saving > 0 ? <><LoaderCircle className="spin" size={12} /> Saving results…</> : `${history.savedCount} ${history.savedCount === 1 ? 'result' : 'results'} added to your history.`} <Link href="/saved-results">View saved results <ArrowRight size={12} /></Link></p>}
        {!!tracks.length && !hasPro && <div className="results-upgrade"><span><LockKeyhole size={15} /><strong>Get the full picture.</strong> Unlock Energy, Dance & Happy with Pro.</span><Link href="/pricing">See plans <ArrowRight size={14} /></Link></div>}
        {hasPro && tracks.some(t => t.status === 'ready' && t.energy === undefined) && <div className="results-upgrade"><span>Your free results are ready for a closer listen.</span><button disabled={busy} onClick={reanalyzePremium}>Analyze with Pro <ArrowRight size={14} /></button></div>}
        {!!tracks.length && <div className="result-filters"><label className="track-search"><span className="visually-hidden">Search tracks</span><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search tracks" placeholder="Search tracks, key or Camelot…" value={search} onChange={e => setSearch(e.target.value)} /></label><CustomSelect ariaLabel="Filter by key status" value={keyFilter} onChange={setKeyFilter} options={KEY_FILTER_OPTIONS} className="filter-select" /><CustomSelect ariaLabel="Sort tracks" value={sortBy} onChange={setSortBy} options={SORT_OPTIONS} className="sort-select" /><span>{visibleTracks.length} of {tracks.length}</span></div>}
        <div className="table-wrap">{!!tracks.length && <table className="analysis-table"><thead><tr><th className="track-col">TRACK <span>LOCAL WORKSPACE</span></th><th className="duration-col"><Clock3 size={12} /> LENGTH</th><><th className="tempo-col">BPM <ArrowDown size={11} /></th><th className="key-col">KEY</th><th className="camelot-col">CAMELOT <span title="A DJ-friendly notation for musical key"><CircleHelp size={11} /></span></th></><th className="wave-col">WAVEFORM</th><th className="metric-col" title="Signal level, not perceived musical intensity">ENERGY</th><th className="metric-col" title={configuration.engine === 'legacy' ? 'Danceable-class model score' : 'Relative match to danceable music descriptions, 0–100'}>DANCE</th><th className="metric-col" title={configuration.engine === 'legacy' ? 'Happy-class model score' : 'Relative match to happy music descriptions, 0–100'}>HAPPY</th><th className="actions-col"><span className="visually-hidden">Track actions</span></th></tr></thead>
        <tbody>{visibleTracks.map(track => <tr key={track.id} className={playing === track.id ? 'is-playing' : ''}><td><div className="track-info"><button className={`track-art ${track.color}`} aria-label={`${playing === track.id ? 'Pause' : 'Play'} ${track.name}`} disabled={track.status !== 'ready'} onClick={() => void playTrack(track)}><span className="art-lines"><i /><i /><i /><i /></span>{playing === track.id ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}</button><div><strong title={track.name}><button className="track-detail-link" disabled={track.status !== 'ready'} aria-label={`View analysis of ${track.name}`} onClick={() => setInspecting(track.id)}>{track.name}</button></strong><span>{track.keyEdited || track.bpmEdited ? 'Manually edited · local result' : track.artist}</span></div></div></td>
          <td className="duration-col mono">{track.duration ? time(track.duration) : '—'}</td>
          {track.status === 'ready' ? <><><td className="bpm-value mono">{track.bpm ?? '—'}</td><td><button className={`key-badge ${track.color}`} data-mode={track.key.endsWith("major") ? "major" : track.key.endsWith("minor") ? "minor" : undefined} aria-label={`Inspect key of ${track.name}`} onClick={() => setInspecting(track.id)}>{hasKeyEstimate(track) ? track.key : 'Not detected'}</button></td><td><span className={`camelot-badge ${track.color}`} data-mode={track.key.endsWith("major") ? "major" : track.key.endsWith("minor") ? "minor" : undefined}>{hasKeyEstimate(track) ? camelotFor(track.key) : 'N/A'}</span></td></><td className="wave-col"><button className={`table-wave ${playing === track.id ? 'playing-wave' : ''}`} aria-label={`Play waveform of ${track.name}`} onClick={() => void playTrack(track)}><Waveform small values={track.waveform} /></button></td>{([track.energy, track.danceability, track.happiness] as const).map((value, index) => <td className="metric-col metric-cell" key={index}>{hasPro ? <button title="Open track analysis for measurement details" onClick={() => setInspecting(track.id)}><span className="mono">{value ?? '—'}</span><i style={{ width: `${value ?? 0}%` }} /></button> : <Link className="metric-lock" href="/pricing" aria-label={`Unlock ${['Energy', 'Dance', 'Happy'][index]} with Pro`}><LockKeyhole size={13} /><span>PRO</span></Link>}</td>)}</> : <><td colSpan={3}><div className={`track-status ${track.status === 'error' ? 'error-text' : ''}`}>{track.status === 'processing' && <LoaderCircle size={14} className="spin" />}{track.status === 'queued' ? 'Waiting in queue…' : track.message}</div></td><td className="wave-col" /><td className="metric-col" /><td className="metric-col" /><td className="metric-col" /></>}
          <td className="actions-cell"><button className="icon-button" aria-label={`Options for ${track.name}`} aria-expanded={activeMenu === track.id} onClick={e => { e.stopPropagation(); setActiveMenu(activeMenu === track.id ? null : track.id); }}><MoreHorizontal size={19} /></button>{activeMenu === track.id && <div className="track-menu" onClick={e => e.stopPropagation()}>{track.status === 'ready' && <button onClick={() => { setActiveMenu(null); setInspecting(track.id); }}><SlidersHorizontal size={13} /> Inspect & edit result</button>}{track.bpm && track.status === 'ready' ? <><div className="menu-label">ADJUST TEMPO</div><div className="tempo-adjust"><button onClick={() => patchTrack(track.id, { bpm: Math.round(track.bpm! / 2 * 10) / 10, bpmEdited: true })}>½×</button><span className="mono">{track.bpm}</span><button onClick={() => patchTrack(track.id, { bpm: Math.round(track.bpm! * 2 * 10) / 10, bpmEdited: true })}>2×</button></div>{track.originalBpm && <button onClick={() => patchTrack(track.id, { bpm: track.originalBpm, bpmEdited: false })}><RotateCcw size={13} /> Reset estimate</button>}</> : null}<button className="delete-action" onClick={() => removeTrack(track.id)}><Trash2 size={13} /> {track.status === 'processing' || track.status === 'queued' ? 'Cancel & remove' : 'Remove track'}</button></div>}</td></tr>)}</tbody></table>}
        {!!tracks.length && !visibleTracks.length && <div className="empty-state"><strong>No matching tracks.</strong><button className="text-button" onClick={() => { setSearch(''); setKeyFilter('all'); }}>Clear filters</button></div>}
        {!tracks.length && <div className="empty-state"><ListMusic size={28} /><strong>A clean slate. A new set.</strong><span>Add your audio files to find their BPM and key.</span><button className="text-button" onClick={() => inputRef.current?.click()}>Choose your first track <ArrowRight size={13} /></button></div>}</div>
        <div className="results-foot"><span><span className="status-dot" />{busy ? 'Analyzing locally. Keep this tab open.' : `${readyCount} track${readyCount === 1 ? '' : 's'} ready · refresh clears results`}</span><span>Good to know: BPM & key are estimates. <button aria-label="Learn about detection accuracy" onClick={() => setGuide('A note on accuracy')}><CircleHelp size={12} /></button></span></div>
      </section>

      <HomepageGuide onToolSelect={setTool} />

      <div className="last-note page-width"><span><Heart size={15} /> Built for people who live a little louder.</span><a href="#workspace" onClick={() => setTool('analyzer')}>Find your next beat <ArrowRight size={15} /></a></div>
    </main>
    <footer className="site-footer page-width"><a className="brand" href="#" aria-label="BPM Finder home"><Brand /></a><div className="footer-identity"><span>© {new Date().getFullYear()} BPM Finder. Made for the love of music.</span><FooterContact /></div><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><button onClick={() => setGuide('A note on accuracy')}>About this tool</button></div></footer>

    {playingTrack && <div className="audio-player"><button className="preview-play" aria-label="Pause playback" onClick={() => { audioRef.current?.pause(); setPlaying(null); }}><Pause size={15} fill="currentColor" /></button><div><strong>{playingTrack.name}</strong><span>Now playing · {playingTrack.bpm} BPM</span></div><input aria-label="Playback position" type="range" min="0" max={playingTrack.duration || 24} step="0.1" value={playTime} onChange={e => { if (audioRef.current) { audioRef.current.currentTime = Number(e.target.value); setPlayTime(Number(e.target.value)); } }} /><span className="mono">{time(playTime)} / {time(playingTrack.duration)}</span><button className="icon-button" aria-label="Close player" onClick={() => { audioRef.current?.pause(); setPlaying(null); }}><X size={16} /></button></div>}
    {inspectedTrack && <TrackInspector premium={hasPro} key={inspectedTrack.id} track={inspectedTrack} onClose={() => setInspecting(null)} onSave={(bpm, key) => { patchTrack(inspectedTrack.id, { bpm, key, camelot: camelotFor(key), bpmEdited: bpm !== (inspectedTrack.originalBpm !== undefined ? inspectedTrack.originalBpm : inspectedTrack.bpm), keyEdited: key !== (inspectedTrack.originalKey ?? inspectedTrack.key) }); setInspecting(null); setNotice('Result updated. Your audio file has not been changed.'); }} onReset={() => patchTrack(inspectedTrack.id, { bpm: inspectedTrack.originalBpm !== undefined ? inspectedTrack.originalBpm : inspectedTrack.bpm, key: inspectedTrack.originalKey || inspectedTrack.key, camelot: inspectedTrack.originalCamelot || inspectedTrack.camelot, bpmEdited: false, keyEdited: false })} />}
    {notice && <div className="toast" role="status"><CircleHelp size={16} /><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice('')}><X size={15} /></button></div>}
    {guide && <div className="modal-backdrop" onClick={() => setGuide(null)}><section className="guide-modal" role="dialog" aria-modal="true" aria-label={guide} onClick={e => e.stopPropagation()}><button autoFocus className="icon-button modal-close" aria-label="Close guide" onClick={() => setGuide(null)}><X size={21} /></button><span className="eyebrow">THE BPM FINDER FIELD NOTES</span><h2>{guide}</h2><><p>{configuration.engine === 'legacy' ? 'BPM detection is cross-checked with Essentia. Musical key compares three HPCP profiles over the entire audio and checks tonal evidence.' : 'BPM detection finds repeating onset patterns across the full audio. Musical key compares its pitch-class spectrum with major and minor key profiles.'} Results are estimates and can be adjusted in the track details.</p><p>Tempo can be ambiguous: 70 and 140 BPM may both make musical sense. Open the track menu to halve or double the tempo. Analysis covers the entire audio. Longer tracks take more time. Mood models process consecutive windows through to the end.</p><p>Live drumming, quiet intros, changing keys and unusual rhythms can affect results. Energy measures signal level. Optional Dance and Happy scores use local audio models. In the default engine they compare the sound with balanced sets of danceable/non-danceable and happy/sad descriptions. These relative matches are not calibrated probabilities or copies of another service’s scores. Open a track to edit its BPM or key.</p></><button className="primary-button" onClick={() => { setGuide(null); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>Back to the music <ArrowRight size={16} /></button></section></div>}
  </div>;
}
