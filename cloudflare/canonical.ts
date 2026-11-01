// Use the actual edge URL, not caller-supplied forwarding headers.
// Local and workers.dev previews deliberately keep their own origin.
export function canonicalRedirectUrl(requestUrl: string, siteUrl = 'https://bpmfder.com'): string | null {
  const url = new URL(requestUrl);
  const canonical = new URL(siteUrl);
  if (canonical.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(canonical.hostname)) return null;
  const alternate = canonical.hostname.startsWith('www.') ? canonical.hostname.slice(4) : `www.${canonical.hostname}`;
  if (![canonical.hostname, alternate].includes(url.hostname) || url.origin === canonical.origin) return null;
  url.protocol = canonical.protocol;
  url.hostname = canonical.hostname;
  url.port = canonical.port;
  return url.href;
}
