const RETURN_ROUTES = new Set(['/', '/blogs', '/pricing', '/saved-results', '/key-finder', '/tap-tempo', '/camelot-wheel', '/bpm-to-ms', '/blogs/how-to-find-key-of-a-song']);

// Only return to existing public pages, never an external site or auth endpoint.
export function safeReturnPath(value: unknown, origin = 'http://localhost:3000') {
  if (typeof value !== 'string' || /[\\\r\n]/.test(value)) return '/';
  try {
    const url = new URL(value, origin);
    if (url.origin !== new URL(origin).origin || !RETURN_ROUTES.has(url.pathname)) return '/';
    if (url.pathname === '/key-finder') return `/${url.hash || '#song-key-finder'}`;
    return `${url.pathname}${url.hash}`;
  } catch { return '/'; }
}

export function authErrorMessage(error?: string) {
  if (error === 'AccessDenied') return 'Google sign-in was not completed. You can try again or keep using the tools as a guest.';
  if (error === 'Configuration') return 'Sign-in is temporarily unavailable. You can still use the audio tools.';
  if (error) return 'We couldn’t finish signing you in. Please try again.';
  return null;
}
