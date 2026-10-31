import 'server-only';
import { getServerSession } from 'next-auth';
import { authOptions, authOrigin } from './auth';
import { storage } from './storage';
import { billing, drainBillingInbox } from './billing';
import { SavedResultError, canSaveResults } from './saved-result-data';
import { accountResponse } from './account-http';

export const savedResults = () => storage('results');
export async function resultIdentity(requirePro = false) {
  const session = await getServerSession(authOptions);
  if (!session?.billingIdentity) throw new SavedResultError('Sign in to save and view your results.', 401);
  if (requirePro && process.env.NODE_ENV !== 'development') {
    await drainBillingInbox();
    if (!canSaveResults(process.env.NODE_ENV, (await billing().entitlement(session.billingIdentity)).hasPro)) throw new SavedResultError('Save Results is included with an active Pro subscription.', 403);
  }
  return session.billingIdentity;
}
export async function readResultRequest(request: Request) {
  const origin = request.headers.get('origin');
  const localOrigin = process.env.NODE_ENV === 'development' && origin === new URL(request.url).origin;
  if ((!localOrigin && origin !== authOrigin()) || request.headers.get('sec-fetch-site') === 'cross-site') throw new SavedResultError('Please save results from this website.', 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new SavedResultError('Send a JSON request.', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new SavedResultError('No results were received.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length;
    if (size > 512 * 1024) { await reader.cancel(); throw new SavedResultError('Too many results. Save a smaller selection.', 413); }
    chunks.push(value);
  }
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new SavedResultError('The results could not be read. Please try again.'); }
}
export function resultFailure(error: unknown) {
  if (error instanceof SavedResultError) return accountResponse({ error: error.message }, error.status);
  console.error('[saved-results] Request failed.');
  return accountResponse({ error: 'Your saved results are temporarily unavailable. Please try again.' }, 503);
}
