export function GapClickDiagram() {
  return <figure className="field-figure"><figcaption><strong>Keep counting through the empty bars</strong><span>Eight bars of 4/4 at 120 BPM. Each bar lasts two seconds; the underlying pulse continues when the click stops.</span></figcaption><ol className="gap-bar-grid" aria-label="The practice track, bar by bar">{Array.from({length:8},(_,i)=>{const quiet=[2,6].includes(i);return <li className={quiet?'is-quiet':''} key={i}><span>BAR {i+1}</span><strong>{quiet?'Count silently':'Click on'}</strong><small>{i*2}–{i*2+2}s</small><div aria-hidden="true">{Array.from({length:4},(_,beat)=><i key={beat}>{quiet?'·':'●'}</i>)}</div></li>;})}</ol><p>The click returns at 6 and 14 seconds, on the next bar’s beat 1. Keep your clapping or simple phrase going across the gap; do not restart the beat when you hear the return.</p></figure>;
}

export function KeyScaleDiagram() {
  const rows=[
    {label:'C major',notes:['C','D','E','F','G','A','B'],tonic:'C',detail:'Same natural-note collection; C is the intended home.'},
    {label:'A natural minor',notes:['A','B','C','D','E','F','G'],tonic:'A',detail:'Same collection, reordered from A; listen for an A-minor center.'},
    {label:'C natural minor',notes:['C','D','E♭','F','G','A♭','B♭'],tonic:'C',detail:'Same tonic as C major, with a different interval pattern.'},
  ];
  return <figure className="field-figure"><figcaption><strong>Same collection or same tonic?</strong><span>Relative scales share a collection. Parallel major/minor scales share a tonic. The outlined note marks each scale’s first degree.</span></figcaption><div className="scale-note-rows">{rows.map(row=><div className="scale-note-row" key={row.label}><strong>{row.label}</strong><ol aria-label={`${row.label} scale notes`}>{row.notes.map(note=><li className={note===row.tonic?'is-tonic':''} key={note}>{note}<span>{note===row.tonic?'TONIC':''}</span></li>)}</ol><p>{row.detail}</p></div>)}</div><p>These are scale spellings. A melody using the notes still needs musical context before you can say which key, if any, it establishes.</p></figure>;
}
