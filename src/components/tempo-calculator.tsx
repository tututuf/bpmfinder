'use client';
import { useState } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import CustomSelect from '@/components/custom-select';
import { formatMusicNumber as fmt, noteValues, timingValues, tempoFromInput, noteMilliseconds } from '@/lib/music-tools';

export default function TempoCalculator() {
  const [unit, setUnit] = useState<'bpm' | 'ms'>('bpm');
  const [value, setValue] = useState('120');
  const [note, setNote] = useState('quarter');
  const [timing, setTiming] = useState('straight');
  const bpm = tempoFromInput(value, unit);
  const selectedNote = noteValues.find(n => n.value === note)!;
  const selectedTiming = timingValues.find(t => t.value === timing)!;
  const duration = bpm === null ? null : noteMilliseconds(bpm, selectedNote.beats, selectedTiming.factor);
  const invalid = !!value && bpm === null;
  function swap() {
    const target = unit === 'bpm' ? 'ms' : 'bpm';
    if (bpm !== null) setValue(String(Number((target === 'ms' ? 60000 / bpm : bpm).toFixed(9))));
    else setValue('');
    setUnit(target);
  }
  return <div className="calculator-shell page-width" id="calculator"><div className="calculator-panel"><div className="calculator-inputs"><span className="eyebrow">TEMPO IN. TIME OUT.</span><div className="calculator-label-row"><label htmlFor="tempo-input">{unit === 'bpm' ? 'Tempo (BPM)' : 'Quarter note (ms)'}</label><button onClick={swap} className="swap-unit" aria-label={unit === 'bpm' ? 'Convert milliseconds to BPM' : 'Convert BPM to milliseconds'}><ArrowLeftRight size={15} />{unit === 'bpm' ? 'ms → BPM' : 'BPM → ms'}</button></div><input id="tempo-input" type="number" inputMode="decimal" step="any" min={unit === 'bpm' ? 1 : 60} max={unit === 'bpm' ? 1000 : 60000} value={value} onChange={e => setValue(e.target.value)} aria-invalid={invalid} aria-describedby="tempo-input-help" /><p id="tempo-input-help" className={invalid ? 'calculator-error' : ''}>{invalid ? 'Enter 1–1,000 BPM, or 60–60,000 ms per quarter note.' : unit === 'bpm' ? 'One beat is a quarter note. Decimals work too.' : 'Enter the duration of one quarter note, not a whole bar.'}</p><div className="calculator-selects"><CustomSelect label="Note length" ariaLabel="Note length" options={noteValues} value={note} onChange={setNote} /><CustomSelect label="Timing" ariaLabel="Timing" options={timingValues} value={timing} onChange={setTiming} /></div></div>
      <div className="calculator-output" aria-live="polite" aria-atomic="true"><span className="eyebrow">{selectedTiming.label.toUpperCase()} / {selectedNote.label.toUpperCase()}</span><div className="calculator-big-number">{fmt(duration)}<span>ms</span></div><p>{duration === null ? 'Add a valid tempo to calculate a note length.' : `${fmt(duration / 1000, 6)} seconds · ${fmt(bpm)} BPM`}</p><div className="calculator-small-results"><div><span>Quarter note</span><strong>{fmt(bpm === null ? null : 60000 / bpm)} <small>ms</small></strong></div><div><span>Beats per second</span><strong>{fmt(bpm === null ? null : bpm / 60)} <small>BPS</small></strong></div></div></div>
    </div><div className="note-values-table"><table><caption>Note lengths at {fmt(bpm)} BPM</caption><thead><tr><th scope="col">Note value</th><th scope="col">Straight (ms)</th><th scope="col">Dotted (ms)</th><th scope="col">Triplet (ms)</th></tr></thead><tbody>{noteValues.map(n => <tr key={n.value} className={n.value === note ? 'selected-note-row' : ''}><th scope="row">{n.label}</th>{timingValues.map(t => <td key={t.value}>{fmt(bpm === null ? null : noteMilliseconds(bpm, n.beats, t.factor))}</td>)}</tr>)}</tbody></table></div></div>;
}
