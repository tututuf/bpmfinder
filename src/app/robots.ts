import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/site';
export default function robots(): MetadataRoute.Robots {
  // Private pages stay crawlable so their existing noindex directives can be read.
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: absoluteUrl('/sitemap.xml') };
}
