import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { pageMetadata } from '@/lib/site';
import { newBlogPosts } from '@/lib/blog-posts';
import './blogs.css';

export const metadata: Metadata = pageMetadata('/blogs', 'Music Guides & Field Notes — BPM Finder Blogs', 'Practical guides to BPM, timing exercises, musical keys, scales and DJ beatmatching. Learn with original audio, worked examples and cited sources.');

function BlogByline({ published }: { published: string }) {
  const dateLabel = new Date(`${published}T00:00:00Z`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  return <div className="blog-card-byline"><span>By BPM Finder editorial</span><time dateTime={published}>{dateLabel}</time></div>;
}

export default function Blogs() {
  return <>
    <main className="blogs-main page-width">
      <div className="blogs-intro"><span className="eyebrow">BPM FINDER / FIELD NOTES</span><h1>Notes on<br /><em>making music.</em></h1><p>Tempo, keys and the details that help a mix come together.</p></div>
      <article className="blog-feature"><div className="blog-feature-art" aria-hidden="true"><strong>8A <small>Am</small></strong><span>↔</span><strong>8B <small>C</small></strong></div><div className="blog-feature-copy"><div className="blog-feature-meta"><span>MUSICAL KEY</span></div><h2><Link href="/blogs/how-to-find-key-of-a-song">How to find the key of a song</Link></h2><p>Four ways to find a song’s key, with listening examples and a step-by-step walkthrough. Follow the chords, find the home note and check the analyzer’s result.</p><BlogByline published="2026-10-31" /><Link className="guide-link" href="/blogs/how-to-find-key-of-a-song">Read the guide <ArrowRight size={16} /></Link></div></article>
      <section className="blog-notes" aria-labelledby="notes-heading"><div className="blog-notes-heading"><span className="eyebrow">LISTEN. READ. TRY IT.</span><h2 id="notes-heading">More from the field notes.</h2><p>Practical guides, each with a different question to answer.</p></div><div className="blog-notes-grid">{newBlogPosts.map((post, index) => <article className={`blog-note blog-note-${index + 1}`} key={post.slug}><Link className="blog-note-art" href={`/blogs/${post.slug}`} tabIndex={-1} aria-hidden="true"><span>FIELD NOTE / 0{index + 2}</span><strong>{post.mark}</strong><span>{post.category}</span></Link><div className="blog-note-copy"><span className="eyebrow">{post.category}</span><h3><Link href={`/blogs/${post.slug}`}>{post.title}</Link></h3><p>{post.description}</p><BlogByline published={post.published} /><Link className="guide-link" href={`/blogs/${post.slug}`}>Read the guide <ArrowRight size={16} /></Link></div></article>)}</div></section>
      <Link className="guide-link" href="/#workspace">Back to the audio tools <ArrowRight size={16} /></Link>
    </main>
    <footer className="blogs-footer page-width"><span>BPM Finder. Made for the love of music.</span><Link href="/">Back to home <ArrowRight size={14} /></Link></footer>
  </>;
}
