import { accountResponse } from '@/lib/account-http';
import { rateLimit } from '@/lib/accounts';
import { saveRequest, SavedResultError } from '@/lib/saved-result-data';
import { resultIdentity, readResultRequest, resultFailure, savedResults } from '@/lib/saved-results';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const identity = await resultIdentity();
    const cursor = new URL(request.url).searchParams.get('before');
    if (cursor !== null && (!/^\d+$/.test(cursor) || !Number.isSafeInteger(Number(cursor)) || Number(cursor) <= 0)) throw new SavedResultError('Invalid result page.');
    return accountResponse(cursor ? await savedResults().list(identity, Number(cursor)) : await savedResults().list(identity));
  } catch (error) { return resultFailure(error); }
}
export async function POST(request: Request) {
  try {
    const body = await readResultRequest(request);
    const identity = await resultIdentity(true);
    const limit = await rateLimit('save-results', identity, 30, 60000);
    if (!limit.allowed) return accountResponse({ error: 'Please wait a moment before saving again.' }, 429, limit.retryAfter);
    const { requestId, tracks } = saveRequest(body);
    return accountResponse({ result: await savedResults().save(identity, requestId, tracks) }, 201);
  } catch (error) { return resultFailure(error); }
}
