import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { legacyAssetsAllowed } from '@/lib/analysis-config';

export const runtime = 'nodejs';
export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!legacyAssetsAllowed()) return new Response('Not found', { status: 404 });
  const { path } = await context.params;
  const name = path.join('/');
  if (!/^(?:[a-z-]+\.mjs|analysis-notices\.txt|vendor\/[A-Za-z0-9_.-]+\.(?:js|map|wasm|txt)|models\/(?:manifest\.json|(?:musicnn|danceability|mood_happy)\/[A-Za-z0-9_.-]+\.(?:json|bin)))$/.test(name)) return new Response('Not found', { status: 404 });
  const root = resolve(/* turbopackIgnore: true */ 'backups/legacy-analysis');
  const file = resolve(root, ...path);
  if (!file.startsWith(root + sep)) return new Response('Not found', { status: 404 });
  try {
    const bytes = await readFile(file);
    const type = /\.m?js$/.test(name) ? 'text/javascript' : name.endsWith('.wasm') ? 'application/wasm' : name.endsWith('.json') || name.endsWith('.map') ? 'application/json' : name.endsWith('.txt') ? 'text/plain' : 'application/octet-stream';
    return new Response(bytes, { headers: { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch { return new Response('Not found', { status: 404 }); }
}
