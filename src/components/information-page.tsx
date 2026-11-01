import Link from 'next/link';
import type { ReactNode } from 'react';
import StructuredData from '@/components/structured-data';
import { ResourceFooter } from '@/components/tool-page';
import { absoluteUrl } from '@/lib/site';
import './information-page.css';

export default function InformationPage({ path, title, eyebrow, description, sections, children }: {
  path: string; title: string; eyebrow: string; description: string;
  sections: readonly { id: string; label: string }[]; children: ReactNode;
}) {
  return <><StructuredData value={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'BPM Finder', item: absoluteUrl('/') },
    { '@type': 'ListItem', position: 2, name: title, item: absoluteUrl(path) },
  ] }} /><main className="information-page page-width">
    <header className="information-header"><nav aria-label="Breadcrumb"><Link href="/">BPM Finder</Link><span aria-hidden="true">/</span><span>{title}</span></nav>
      <span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>
    </header>
    <div className="information-layout"><aside className="information-contents"><nav aria-label="On this page"><span>ON THIS PAGE</span><ul>{sections.map(section => <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>)}</ul></nav><Link href={path === '/about' ? '/analysis-methodology' : '/about'}>{path === '/about' ? 'How the analysis works' : 'About the project'} <span aria-hidden="true">↗</span></Link></aside>
      <div className="information-body">{children}</div>
    </div>
  </main><ResourceFooter /></>;
}
