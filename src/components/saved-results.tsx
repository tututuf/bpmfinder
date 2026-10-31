'use client';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Bookmark, ChevronDown, LoaderCircle, Music2, Trash2 } from 'lucide-react';
import { resultCsv } from '@/lib/result-data';
import type { SavedResultSummary, SavedResult } from '@/lib/saved-result-data';
import { useBilling } from './billing-provider';
const date = (stamp: number) => new Date(stamp).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export default function SavedResults() {
  const { data: session, status } = useSession();
  const { hasPro } = useBilling();
  const owner = status === 'authenticated' ? session?.billingIdentity || '' : '';
  const currentOwner = useRef(owner); currentOwner.current = owner;
  const [collection, setCollection] = useState<{ owner: string; items: SavedResultSummary[]; cursor: string | null }>({ owner: '', items: [], cursor: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<{ owner: string; result: SavedResult } | null>(null);
  const [selected, setSelected] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const detailRequest = useRef(0);
  const listRequest = useRef(0);
  const load = useCallback(async (cursor?: string) => {
    const request = ++listRequest.current;
    setLoading(true); setError('');
    try {
      const response = await fetch(`/api/results${cursor ? `?before=${encodeURIComponent(cursor)}` : ''}`, { cache: 'no-store' });
      const data = await response.json();
      if (owner !== currentOwner.current || request !== listRequest.current) return;
      if (!response.ok) throw new Error(data.error || 'Couldn’t load your results.');
      setCollection(previous => ({ owner, items: cursor && previous.owner === owner ? [...previous.items, ...data.results] : data.results, cursor: data.nextCursor }));
    } catch (failure) { if (owner === currentOwner.current && request === listRequest.current) setError(failure instanceof Error ? failure.message : 'Couldn’t load your results. Try again.'); }
    finally { if (owner === currentOwner.current && request === listRequest.current) setLoading(false); }
  }, [owner]);
  useEffect(() => {
    setDetail(null); setSelected(''); setConfirmDelete(false); setError(''); detailRequest.current++;
    if (owner) void load();
    return () => { listRequest.current++; detailRequest.current++; };
  }, [owner, load]);
  async function open(id: string) {
    const request = ++detailRequest.current;
    setSelected(id); setDetail(null); setDetailLoading(true); setConfirmDelete(false); setError('');
    try {
      const response = await fetch(`/api/results/${encodeURIComponent(id)}`, { cache: 'no-store' });
      const data = await response.json();
      if (owner !== currentOwner.current || request !== detailRequest.current) return;
      if (!response.ok) throw new Error(data.error || 'Couldn’t open these results.');
      setDetail({ owner, result: data.result });
    } catch (failure) { if (owner === currentOwner.current && request === detailRequest.current) setError(failure instanceof Error ? failure.message : 'Couldn’t open these results. Try again.'); }
    finally { if (owner === currentOwner.current && request === detailRequest.current) setDetailLoading(false); }
  }
  const result = detail?.owner === owner ? detail.result : null;
  function download() {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([resultCsv(result.tracks, true)], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a'); link.href = url; link.download = `bpmfinder-saved-${result.id}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function remove() {
    if (!result || deleting) return;
    setDeleting(true); setError('');
    try {
      const response = await fetch(`/api/results/${result.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await response.json();
      if (owner !== currentOwner.current) return;
      if (!response.ok) throw new Error(data.error || 'Couldn’t delete these results.');
      setCollection(previous => ({ ...previous, items: previous.items.filter(item => item.id !== result.id) }));
      setDetail(null); setSelected(''); setConfirmDelete(false);
    } catch (failure) { if (owner === currentOwner.current) setError(failure instanceof Error ? failure.message : 'Couldn’t delete these results. Try again.'); }
    finally { setDeleting(false); }
  }
  if (status === 'loading') return <p className="saved-loading" role="status"><LoaderCircle className="spin" size={18} /> Loading your collection…</p>;
  if (status === 'unauthenticated') return <section className="saved-empty"><Bookmark size={30} /><h2>Your results, ready for an encore.</h2><p>Sign in to revisit the results you saved with Pro.</p><Link className="primary-button" href="/login?callbackUrl=%2Fsaved-results">Sign in <ArrowRight size={16} /></Link><Link className="saved-back" href="/#workspace">Back to the free tools</Link></section>;
  const items = collection.owner === owner ? collection.items : [];
  const loadingCollection = !!owner && !error && (loading || collection.owner !== owner);
  return <>
    <div className="saved-collection-bar"><span><Bookmark size={16} /> SAVED RESULTS</span><Link href="/#workspace">Analyze more tracks <ArrowRight size={14} /></Link></div>
    <p className="saved-explanation">Results generated with Save Results selected are kept in your account. Audio files stay on your device.{!hasPro && ' An active Pro plan is needed to save new results; your existing collection stays available.'}</p>
    {error && <div className="saved-error" role="alert">{error} <button onClick={() => selected ? void open(selected) : void load()}>Try again</button></div>}
    {!items.length && loadingCollection ? <p className="saved-loading" role="status"><LoaderCircle className="spin" size={18} /> Loading saved results…</p> : !items.length && !error ? <section className="saved-empty"><Music2 size={30} /><h2>No saved results yet.</h2><p>Head to the BPM Finder, select Save Results, then upload a track. Your saved analysis will appear here.</p><Link className="primary-button" href="/#workspace">Analyze your first track <ArrowRight size={16} /></Link>{!hasPro && <Link className="saved-back" href="/pricing">Explore Pro</Link>}</section> : null}
    {!!items.length && <div className="saved-layout"><section className="saved-sessions" aria-label="Saved sessions">{items.map(item => <button key={item.id} className={`saved-session ${selected === item.id ? 'is-selected' : ''}`} aria-pressed={selected === item.id} onClick={() => void open(item.id)}><span className="saved-session-date">{date(item.savedAt)}</span><strong>{item.preview}</strong><span>{item.trackCount} track{item.trackCount === 1 ? '' : 's'} <ArrowRight size={15} /></span></button>)}{collection.cursor && <button className="outline-button saved-load-more" disabled={loading} onClick={() => void load(collection.cursor!)}>{loading ? 'Loading…' : 'Load more'}<ChevronDown size={14} /></button>}</section>
      <section className="saved-detail" aria-label="Saved analysis">{detailLoading ? <p className="saved-loading" role="status"><LoaderCircle className="spin" size={18} /> Opening results…</p> : result ? <>
        <div className="saved-detail-heading"><div><span className="eyebrow">ANALYSIS SNAPSHOT</span><h2>{result.trackCount} track{result.trackCount === 1 ? '' : 's'}, kept.</h2><p>{date(result.savedAt)}</p></div><button className="outline-button" onClick={download}><ArrowDownToLine size={14} /> Export CSV</button></div>
        <div className="saved-table-scroll"><table className="saved-table"><thead><tr>{['TRACK', 'LENGTH', 'BPM', 'KEY', 'CAMELOT', 'ENERGY', 'DANCE', 'HAPPY'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{result.tracks.map(track => <tr key={track.id}><td><strong>{track.name}</strong><small className="saved-track-duration">{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</small>{(track.keyEdited || track.bpmEdited) && <small>Manually edited</small>}</td><td>{Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}</td><td data-label="BPM">{track.bpm ?? '—'}</td><td data-label="KEY">{track.key === 'Undetermined' ? 'Not detected' : track.key}</td><td data-label="CAMELOT">{track.camelot === '—' ? 'N/A' : track.camelot}</td><td data-label="ENERGY">{track.energy ?? '—'}</td><td data-label="DANCE">{track.danceability ?? '—'}</td><td data-label="HAPPY">{track.happiness ?? '—'}</td></tr>)}</tbody></table></div>
        <p className="saved-snapshot-note">These are the results as you saved them. To play audio or run a new analysis, select the original files in the tool.</p>
        <div className="saved-delete">{confirmDelete ? <><p>Delete this saved snapshot? This cannot be undone.</p><button className="text-button" disabled={deleting} onClick={() => setConfirmDelete(false)}>Keep results</button><button className="outline-button" disabled={deleting} onClick={remove}>{deleting ? 'Deleting…' : 'Delete results'}</button></> : <button className="text-button" onClick={() => setConfirmDelete(true)}><Trash2 size={14} /> Delete saved results</button>}</div>
      </> : <div className="saved-detail-prompt"><Bookmark size={28} /><h2>Pick up where you left off.</h2><p>Choose a saved session to see its track analysis.</p></div>}</section>
    </div>}
  </>;
}
