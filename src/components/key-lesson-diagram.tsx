const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

export default function KeyLessonDiagram() {
  return <figure className="key-lesson-diagram">
    <figcaption><strong>The same white keys. A different home note.</strong><span>C major and A natural minor share these seven notes.</span></figcaption>
    <div className="key-lesson-keyboards">{[{ name: 'C major', root: 0, color: '#ff756b' }, { name: 'A natural minor', root: 5, color: '#a5cfe3' }].map(({ name, root, color }) => <div key={name}>
      <span>{name}</span>
      <svg viewBox="0 0 420 164" role="img" aria-label={`${name}: C, D, E, F, G, A and B on a piano; ${notes[root]} is the tonic.`}>
        {notes.map((note, index) => <g key={note}><rect x={index * 60 + 2} y="2" width="56" height="153" rx="5" fill={index === root ? color : '#e8e3d9'} /><text x={index * 60 + 30} y="132" textAnchor="middle" fill="#202020" fontSize="18" fontFamily="var(--mono)">{note}</text>{index === root && <circle cx={index * 60 + 30} cy="100" r="4" fill="#202020" />}</g>)}
        {[1, 2, 4, 5, 6].map(index => <rect key={index} x={index * 60 - 17} y="0" width="34" height="91" rx="4" fill="#171717" stroke="#49443d" />)}
      </svg>
      <p><i style={{ background: color }} /> {notes[root]} is the tonic, or home note.</p>
    </div>)}</div>
    <p>The highlighted key marks a tonal center, not a different tuning. Listen to where a phrase resolves; the note collection by itself does not choose the key.</p>
  </figure>;
}
