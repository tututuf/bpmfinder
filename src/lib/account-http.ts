import 'server-only';
import { authOrigin } from './auth';

export class AccountRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function accountResponse(body: object, status = 200, retryAfter?: number) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', ...(retryAfter ? { 'Retry-After': String(retryAfter) } : {}) } });
}
export async function readAccountRequest(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('origin') !== authOrigin() || request.headers.get('sec-fetch-site') === 'cross-site') {
    throw new AccountRequestError(403, 'Please use the sign-in page to continue.');
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new AccountRequestError(415, 'Send a JSON request.');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new AccountRequestError(400, 'Please check the form and try again.');
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > 4096) { await reader.cancel(); throw new AccountRequestError(413, 'The request is too large.'); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new AccountRequestError(400, 'Please check the form and try again.'); }
}
export function accountFailure(error: unknown) {
  if (error instanceof AccountRequestError) return accountResponse({ error: error.message }, error.status);
  console.error('[accounts] Account request failed.');
  return accountResponse({ error: 'Something went wrong. Please try again shortly.' }, 503);
}
