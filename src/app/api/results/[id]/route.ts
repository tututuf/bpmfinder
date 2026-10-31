import { accountResponse } from '@/lib/account-http';
import { resultIdentity, readResultRequest, resultFailure, savedResults } from '@/lib/saved-results';
type Context = { params: Promise<{ id: string }> };
export const runtime = 'nodejs';
export async function GET(_request: Request, context: Context) {
  try {
    const identity = await resultIdentity(); const { id } = await context.params;
    const result = await savedResults().get(identity, id);
    return result ? accountResponse({ result }) : accountResponse({ error: 'Saved results not found.' }, 404);
  } catch (error) { return resultFailure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    await readResultRequest(request);
    const identity = await resultIdentity(); const { id } = await context.params;
    return await savedResults().delete(identity, id) ? accountResponse({ deleted: true }) : accountResponse({ error: 'Saved results not found.' }, 404);
  } catch (error) { return resultFailure(error); }
}
