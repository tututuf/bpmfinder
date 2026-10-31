import type { MetadataRoute } from 'next';
import { absoluteUrl, publicPages } from '@/lib/site';
export default function sitemap(): MetadataRoute.Sitemap {
  return publicPages.map(path => ({ url: absoluteUrl(path) }));
}
