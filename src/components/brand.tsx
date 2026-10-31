export default function Brand() {
  return <>
    <span className="brand-icon brand-record" aria-hidden="true"><svg viewBox="0 0 40 40" fill="none">
      <circle cx="19" cy="21" r="17" fill="#ff756b" />
      <circle cx="19" cy="21" r="12.5" stroke="#211716" strokeOpacity=".5" />
      <circle cx="19" cy="21" r="9" stroke="#211716" strokeOpacity=".5" />
      <circle cx="19" cy="21" r="5" fill="#211716" />
      <circle cx="19" cy="21" r="1.6" fill="#f4f1ea" />
      <path d="M34 3h-5l-5 12" stroke="#141414" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 3h-5l-5 12" stroke="#f4f1ea" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m22.5 14.5 3 1.3-1.4 3.3-3-1.3z" fill="#f4f1ea" />
    </svg></span>
    <span className="brand-wordmark"><b>BPM</b><span>Finder</span><i>.</i></span>
  </>;
}
