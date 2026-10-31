import Link from 'next/link';
import type { ReactNode } from 'react';
import ArticleContents from '@/components/article-contents';
import StructuredData from '@/components/structured-data';
import { RelatedTools, ResourceFooter } from '@/components/tool-page';
import { absoluteUrl } from '@/lib/site';
import { blogPost, newBlogPosts, type BlogSlug } from '@/lib/blog-posts';

export type ArticleSource = { title: string; url: string; supports: string };
export function Cite({ n }: { n: number }) { return <sup className="article-citation"><a href={`#source-${n}`} aria-label={`Read source ${n}`}>[{n}]</a></sup>; }
export function ArticleTable({ caption, headings, rows }: { caption: ReactNode; headings: string[]; rows: ReactNode[][] }) {
  return <div className="field-table-wrap"><table className="field-table"><caption>{caption}</caption><thead><tr>{headings.map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row, i) => <tr key={i}>{row.map((cell, j) => j === 0 ? <th scope="row" key={j}>{cell}</th> : <td key={j}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function ListeningExample({ file, title, label, children, folder = 'field-notes' }: { file: string; title: string; label: string; children: ReactNode; folder?: string }) {
  return <figure className="field-audio"><figcaption><span>LISTEN</span><strong>{title}</strong><small>{label}</small></figcaption><audio controls preload="none" aria-label={`Play ${title}`}><source src={`/audio/${folder}/${file}.wav`} type="audio/wav" />Use the WAV download below to listen.</audio><p>{children}</p><a href={`/audio/${folder}/${file}.wav`} download>Download {title} WAV <span aria-hidden="true">↓</span></a></figure>;
}
export function ToolPrompt({ href = '/#workspace', title, text, label }: { href?: string; title: string; text: string; label: string }) {
  return <aside className="article-tool-cta"><div><strong>{title}</strong><p>{text}</p></div><Link className="primary-button" href={href}>{label} →</Link></aside>;
}
export default function FieldNote({ slug, sources, contents, introduction, children, audio = [] }: { slug: BlogSlug; sources: ArticleSource[]; contents: { id: string; label: string; shortLabel?: string }[]; introduction: ReactNode; children: ReactNode; audio?: { file: string; title: string; seconds: number; folder?: string }[] }) {
  const post = blogPost(slug);
  const path = `/blogs/${slug}`;
  const dateLabel = new Date(`${post.published}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  return <><StructuredData value={{ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: post.title, description: post.description, mainEntityOfPage: absoluteUrl(path), image: absoluteUrl('/images/bpm-finder-social.png'), datePublished: post.published, dateModified: post.published, inLanguage: 'en', author: { '@type': 'Organization', name: 'BPM Finder editorial', url: absoluteUrl('/blogs') }, publisher: { '@type': 'Organization', name: 'BPM Finder', url: absoluteUrl('/') }, citation: sources.map(source => ({ '@type': 'CreativeWork', name: source.title, url: source.url })), ...(audio.length ? { hasPart: audio.map(a => ({ '@type': 'AudioObject', name: a.title, contentUrl: absoluteUrl(`/audio/${a.folder || 'field-notes'}/${a.file}.wav`), encodingFormat: 'audio/wav', duration: `PT${a.seconds}S` })) } : {}) }} />
    <main className="article-page page-width"><nav className="article-breadcrumb" aria-label="Breadcrumb"><Link href="/">BPM Finder</Link><span aria-hidden="true">/</span><Link href="/blogs">Blogs</Link><span aria-hidden="true">/</span><span>{post.category.toLowerCase()}</span></nav>
      <header className="article-heading"><span className="eyebrow">FIELD NOTES / {post.category}</span><h1>{post.title}</h1><p className="article-deck">{post.deck}</p><div className="article-byline"><span>By BPM Finder editorial</span><time dateTime={post.published}>{dateLabel}</time><span>{post.detail}</span></div></header>
      <div className="article-reading-layout"><div className="article-body">{introduction}<ArticleContents items={contents} />{children}
        <section className="article-sources" id="sources" aria-labelledby="sources-heading"><h2 id="sources-heading">Sources</h2><ol>{sources.map((source, index) => <li id={`source-${index + 1}`} key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a><span>{source.supports}</span></li>)}</ol></section>
        <section className="field-related" aria-labelledby="related-reading"><span className="eyebrow">THE NEXT RECORD</span><h2 id="related-reading">Keep reading</h2><div><Link href="/blogs/how-to-find-key-of-a-song">How to find the key of a song <span aria-hidden="true">↗</span></Link>{newBlogPosts.filter(p => p.slug !== slug).map(p => <Link href={`/blogs/${p.slug}`} key={p.slug}>{p.title}<span aria-hidden="true">↗</span></Link>)}</div></section>
      </div><aside className="article-sidebar" aria-label="Reading navigation"><div data-article-sidebar /></aside></div>
    </main><RelatedTools current="article" /><ResourceFooter /></>;
}
