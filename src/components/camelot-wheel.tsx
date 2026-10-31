'use client';
import { useId, useRef, useState } from 'react';
import CustomSelect from '@/components/custom-select';
import { camelotKeys, compatibleKeys } from '@/lib/music-tools';

const point = (r: number, angle: number) => [260 + r * Math.cos(angle * Math.PI / 180), 260 + r * Math.sin(angle * Math.PI / 180)];
function wedge(inner: number, outer: number, center: number) {
  const a = point(outer, center - 15), b = point(outer, center + 15), c = point(inner, center + 15), d = point(inner, center - 15);
  return `M${a.join(',')} A${outer},${outer} 0 0 1 ${b.join(',')} L${c.join(',')} A${inner},${inner} 0 0 0 ${d.join(',')} Z`;
}
export default function CamelotWheel() {
  const [code, setCode] = useState('8A');
  const refs = useRef(new Map<string, SVGGElement>());
  const titleId = useId();
  const selected = camelotKeys.find(k => k.code === code)!;
  const matches = compatibleKeys(code);
  return <div className="camelot-instrument page-width"><div className="wheel-figure"><svg viewBox="0 0 520 520" aria-labelledby={titleId}><title id={titleId}>Interactive Camelot wheel. Use arrow keys to move between musical keys.</title>{camelotKeys.map(k => {
    const n = Number.parseInt(k.code), major = k.mode === 'major', angle = -90 + n % 12 * 30;
    const [x,y] = point(major ? 199 : 119, angle);
    const match = matches.findIndex(m => m.code === k.code);
    return <g ref={node => { if (node) refs.current.set(k.code, node); else refs.current.delete(k.code); }} key={k.code} role="button" tabIndex={k.code === code ? 0 : -1} aria-label={`${k.code}, ${k.key}`} aria-pressed={k.code === code} className={`wheel-segment ${major ? 'major' : 'minor'} ${match === 0 ? 'is-selected' : match === 3 ? 'is-relative' : match > 0 ? 'is-neighbor' : ''}`} onClick={() => setCode(k.code)} onKeyDown={event => {
      let next = '';
      if (event.key === 'Enter' || event.key === ' ') next = k.code;
      if (event.key === 'ArrowRight') next = `${n % 12 + 1}${major ? 'B' : 'A'}`;
      if (event.key === 'ArrowLeft') next = `${(n + 10) % 12 + 1}${major ? 'B' : 'A'}`;
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') next = `${n}${major ? 'A' : 'B'}`;
      if (next) { event.preventDefault(); setCode(next); refs.current.get(next)?.focus(); }
    }}><path d={wedge(major ? 156 : 79, major ? 242 : 153, angle)} /><text x={x} y={y - 2} textAnchor="middle"><tspan className="wheel-code">{k.code}</tspan><tspan x={x} dy="17" className="wheel-note">{k.note}{major ? '' : 'm'}</tspan></text></g>;
  })}<circle cx="260" cy="260" r="72" className="wheel-center" /><text x="260" y="251" textAnchor="middle" className="wheel-center-label">CAMELOT</text><text x="260" y="278" textAnchor="middle" className="wheel-center-code">{code}</text></svg><div className="wheel-legend"><span><i />Selected</span><span><i />Neighbors</span><span><i />Relative key</span></div><p className="wheel-keyboard-hint">Select a segment. Arrow keys move around and between rings.</p></div>
    <div className="wheel-readout"><span className="eyebrow">FIND YOUR NEXT TRANSITION</span><CustomSelect ariaLabel="Starting musical key" label="Starting key" value={code} onChange={setCode} options={camelotKeys.map(k => ({ value: k.code, label: `${k.code} · ${k.key}` }))} /><div className="wheel-selected" aria-live="polite"><strong>{selected.code}</strong><span>{selected.key}</span></div><h2>Start with these keys.</h2><div className="compatible-key-list">{matches.map((k,i) => <button key={k.code} onClick={() => setCode(k.code)}><span className="key-chip">{k.code}</span><span><strong>{k.key}</strong><small>{['Same key', 'Neighboring key', 'Neighboring key', selected.mode === 'minor' ? 'Relative major' : 'Relative minor'][i]}</small></span><span aria-hidden="true">↗</span></button>)}</div><p className="wheel-listen-note">Useful starting points, not a guarantee. Preview the transition and listen to the vocals, bass and phrasing together.</p></div>
  </div>;
}
