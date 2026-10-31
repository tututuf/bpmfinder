import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  async redirects() {
    const mergedPages = [{ source: '/key-finder', destination: '/#song-key-finder', permanent: true }];
    const canonical = new URL(process.env.SITE_URL || 'https://bpmfder.com');
    if (['localhost', '127.0.0.1', '[::1]'].includes(canonical.hostname)) return mergedPages;
    const alternateHost = canonical.hostname.startsWith('www.') ? canonical.hostname.slice(4) : `www.${canonical.hostname}`;
    return [{ source: '/:path*', has: [{ type: 'host', value: alternateHost }], destination: `${canonical.origin}/:path*`, permanent: true }, ...mergedPages];
  },
};
export default config;
