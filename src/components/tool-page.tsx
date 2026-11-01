import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';
import StructuredData from '@/components/structured-data';
import { absoluteUrl } from '@/lib/site';
import FooterContact from '@/components/footer-contact';
import SiteInformationLinks from '@/components/site-information-links';

export const toolLinks = [
  { href: '/', title: 'BPM Finder', text: 'Upload audio to measure its tempo and key.' },
  { href: '/tap-tempo', title: 'Tap Tempo', text: 'Follow the pulse. Tap to measure BPM.' },
  { href: '/camelot-wheel', title: 'Camelot Wheel', text: 'Look up keys and plan a harmonic mix.' },
  { href: '/bpm-to-ms', title: 'BPM to ms', text: 'Set delay times and compare note values.' },
];
export function RelatedTools({ current }: { current: string }) {
  return <section className="related-tools page-width" aria-labelledby="related-tools-title"><div className="resource-heading"><span className="eyebrow">KEEP THE MUSIC MOVING</span><h2 id="related-tools-title">A few more tools for your set.</h2></div><div className="related-tools-grid">{toolLinks.filter(t => t.href !== current).map(t => <Link href={t.href} key={t.href}><h3>{t.title}<ArrowRight size={17} aria-hidden="true" /></h3><p>{t.text}</p></Link>)}</div></section>;
}
export function ResourceFooter() {
  return <footer className="resource-footer page-width"><div className="footer-identity"><span>BPM Finder. Made for the love of music.</span><FooterContact /></div><div><Link href="/">BPM Finder</Link><Link href="/blogs">Field notes</Link><Link href="/pricing">Free & Pro</Link><SiteInformationLinks /><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link></div></footer>;
}
export function ToolPage({ eyebrow, title, accent, description, children }: { eyebrow: string; title: string; accent: string; description: string; children: ReactNode }) {
  const path = toolLinks.find(tool => tool.title === title)?.href;
  return <main className="resource-page">{path && <StructuredData value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type':'ListItem', position:1, name:'BPM Finder', item:absoluteUrl('/') }, { '@type':'ListItem', position:2, name:title, item:absoluteUrl(path) }] }} />}<div className="resource-intro page-width"><nav aria-label="Breadcrumb"><Link href="/">BPM Finder</Link><span aria-hidden="true">/</span><span>{title}</span></nav><span className="eyebrow">{eyebrow}</span><h1>{title}<br /><em>{accent}</em></h1><p>{description}</p></div>{children}</main>;
}
export function Questions({ title, items }: { title: string; items: readonly (readonly [string, string])[] }) {
  return <section className="resource-questions page-width"><div className="resource-heading"><span className="eyebrow">GOOD TO KNOW</span><h2>{title}</h2></div><div>{items.map(([q,a]) => <details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>;
}
