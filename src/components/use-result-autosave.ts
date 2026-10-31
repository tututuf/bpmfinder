'use client';
import { useEffect, useRef, useState } from 'react';
import { snapshotTracks, type SavedTrack } from '@/lib/saved-result-data';
import type { Track } from '@/lib/result-data';

type Options = { owner: string; hasPro: boolean; developmentSavingUnlocked?: boolean; refresh: () => Promise<{ hasPro: boolean; developmentSavingUnlocked?: boolean }>; requestAccess: () => void };
type PendingSave = { owner: string; epoch: number; requestId: string; tracks: SavedTrack[] };

// Save only on analysis completion, never by scanning rendered/filtered results.
export function useResultAutosave(options: Options) {
  const current = useRef(options); current.current = options;
  const consent = useRef<{ owner: string; epoch: number } | null>(null);
  const epoch = useRef(0);
  const pending = useRef(new Map<string, PendingSave>());
  const requests = useRef(new Set<AbortController>());
  const [enabled, setEnabled] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [error, setError] = useState('');
  const [failedCount, setFailedCount] = useState(0);
  const [retrying, setRetrying] = useState(false);

  function disable() {
    epoch.current++; consent.current = null; pending.current.clear();
    requests.current.forEach(controller => controller.abort()); requests.current.clear();
    setEnabled(false); setChecking(false); setSaving(0); setFailedCount(0); setRetrying(false);
  }
  useEffect(() => {
    disable(); setSavedCount(0); setError('');
    return () => { epoch.current++; consent.current = null; pending.current.clear(); requests.current.forEach(controller => controller.abort()); requests.current.clear(); };
  }, [options.owner]);
  useEffect(() => { if (!options.hasPro && !options.developmentSavingUnlocked && consent.current) disable(); }, [options.hasPro, options.developmentSavingUnlocked]);

  async function toggle(checked: boolean) {
    if (!checked) { disable(); setError(''); return; }
    if (checking) return;
    if (!current.current.owner) { current.current.requestAccess(); return; }
    const owner = current.current.owner, attempt = ++epoch.current;
    setChecking(true); setError('');
    try {
      const access = await current.current.refresh();
      if (attempt !== epoch.current || owner !== current.current.owner) return;
      if (!access.hasPro && !access.developmentSavingUnlocked) { current.current.requestAccess(); return; }
      consent.current = { owner, epoch: attempt }; setEnabled(true);
    } catch { if (attempt === epoch.current) setError('Couldn’t check your plan. Try selecting Save Results again.'); }
    finally { if (attempt === epoch.current) setChecking(false); }
  }
  const active = (item: { owner: string; epoch: number }) => (current.current.hasPro || current.current.developmentSavingUnlocked) && current.current.owner === item.owner && consent.current?.owner === item.owner && consent.current.epoch === item.epoch;

  async function send(item: PendingSave) {
    if (!active(item)) return;
    const controller = new AbortController(); requests.current.add(controller); setSaving(value => value + 1);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId: item.requestId, tracks: item.tracks }), signal: controller.signal });
      const data = await response.json();
      if (!active(item)) return;
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) { disable(); setError(data.error || 'Sign in with Pro, then select Save Results again.'); return; }
        throw new Error(data.error || 'Couldn’t save a result. Your analysis is still available below.');
      }
      pending.current.delete(item.requestId); setSavedCount(value => value + item.tracks.length);
      setFailedCount(pending.current.size); if (!pending.current.size) setError('');
    } catch (failure) {
      if (active(item)) { pending.current.set(item.requestId, item); setFailedCount(pending.current.size); setError(controller.signal.aborted ? 'Saving timed out. Your analysis is still available below.' : failure instanceof Error ? failure.message : 'Couldn’t save a result. Your analysis is still available below.'); }
    } finally {
      clearTimeout(timeout);
      requests.current.delete(controller);
      if (active(item)) setSaving(value => Math.max(0, value - 1));
    }
  }
  async function completed(track: Track, analysisOwner: string) {
    const choice = consent.current;
    if (!choice || choice.owner !== analysisOwner || !active(choice)) return;
    try { await send({ ...choice, requestId: crypto.randomUUID(), tracks: snapshotTracks([track]) }); }
    catch { if (active(choice)) setError('This result could not be saved. Your analysis is still available below.'); }
  }
  async function retry() {
    if (retrying || saving) return;
    setRetrying(true);
    try { for (const item of Array.from(pending.current.values())) await send(item); }
    finally { setRetrying(false); }
  }
  return { enabled: enabled && consent.current?.owner === options.owner && !!(options.hasPro || options.developmentSavingUnlocked), checking, saving, savedCount, error, failedCount, retrying, toggle, completed, retry };
}
