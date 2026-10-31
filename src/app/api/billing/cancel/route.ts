import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { billing, paymentCredentialsConfigured, drainBillingInbox, waffoClient } from '@/lib/billing';
import { accountResponse, readAccountRequest, accountFailure } from '@/lib/account-http';
import { rateLimit } from '@/lib/accounts';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    await readAccountRequest(request);
    const session = await getServerSession(authOptions);
    if (!session?.billingIdentity) return accountResponse({ error: 'Sign in to manage your subscription.' }, 401);
    if (!paymentCredentialsConfigured()) return accountResponse({ error: 'Subscription management is temporarily unavailable. Contact support@bpmfder.com for help.' }, 503);
    const limit = await rateLimit('billing-cancel', session.billingIdentity, 5, 600000);
    if (!limit.allowed) return accountResponse({ error: 'Please wait before trying again.' }, 429, limit.retryAfter);
    await drainBillingInbox();
    const row = await billing().subscription(session.billingIdentity);
    if (!row || !['active', 'canceling', 'past_due'].includes(row.state)) return accountResponse({ error: 'No active subscription was found.' }, 400);
    if (row.state === 'canceling') return accountResponse({ message: 'Your subscription already ends after the current period.' });
    const result = await waffoClient().orders.cancelSubscription({ orderId: row.order_id }, { idempotencyKey: `cancel_${row.order_id}` });
    if (result.status !== 'canceling' && result.status !== 'canceled') throw new Error('Cancellation was not accepted.');
    await billing().markCanceling(row.order_id, session.billingIdentity, result.status);
    // The signed terminal webhook determines final revocation.
    return accountResponse({ message: row.state === 'active' && result.status === 'canceling' ? 'Renewal canceled. Pro stays available until the end of the paid period.' : 'Your subscription renewal has been canceled.' });
  } catch (error) { return accountFailure(error); }
}
