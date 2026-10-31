import type { Metadata } from 'next';
import { newBlogPosts } from '@/lib/blog-posts';

// SEO origin is independent of NEXTAUTH_URL, which is often localhost in development.
export function siteOrigin() {
  const value = new URL(process.env.SITE_URL || 'https://bpmfder.com');
  if (!['http:', 'https:'].includes(value.protocol) || value.username || value.password) throw new Error('SITE_URL must be an HTTP(S) site origin.');
  return value.origin;
}
export const publicPages = ['/', '/tap-tempo', '/camelot-wheel', '/bpm-to-ms', '/blogs', '/blogs/how-to-find-key-of-a-song', ...newBlogPosts.map(post => `/blogs/${post.slug}` as const), '/pricing', '/terms', '/privacy'] as const;
export function absoluteUrl(path: string) { return new URL(path, siteOrigin()).href; }
export function pageMetadata(path: string, title: string, description: string, article = false): Metadata {
  return { title, description, alternates: { canonical: path },
    openGraph: { title, description, url: path, siteName: 'BPM Finder', locale: 'en_US', type: article ? 'article' : 'website', images: [{ url: '/images/bpm-finder-social.png', width: 1200, height: 630, alt: 'BPM Finder — tempo, key and the next good mix' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/images/bpm-finder-social.png'] },
  };
}
export function applicationSchema(path: string, name: string, description: string, features: string[]) {
  return { '@context': 'https://schema.org', '@type': 'WebApplication', '@id': absoluteUrl(`${path}#application`), name, url: absoluteUrl(path), description,
    applicationCategory: 'MultimediaApplication', operatingSystem: 'Web browser', browserRequirements: 'A modern browser with JavaScript enabled',
    isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, featureList: features,
  };
}
